import { Router, Response } from "express";
import { authenticate, AuthRequest, requireAdmin } from "../middleware/auth";
import { pool, query } from "../config/db";
import * as analyticsService from "../services/analyticsService";

const router = Router();

function isAllowedReceiptFileUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 1000) return false;

  if (/^\/(?:uploads\/|api\/uploads\/)/.test(value)) return true;

  try {
    const url = new URL(value);
    const allowedOrigins = new Set<string>();

    const configuredApiUrl = process.env.API_URL?.trim();
    if (configuredApiUrl) {
      try {
        allowedOrigins.add(new URL(configuredApiUrl).origin);
      } catch {
        // ignore invalid configured URL
      }
    }

    ["http://localhost:3000", "http://127.0.0.1:3000"].forEach((origin) =>
      allowedOrigins.add(origin),
    );

    return allowedOrigins.has(url.origin) && /^\/uploads\//.test(url.pathname);
  } catch {
    return false;
  }
}

router.get(
  "/receipts/mine",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT r.id, r.receipt_image_url, r.amount_etb, r.note, r.status,
              r.created_at, r.reviewed_at, c.title AS course_title, c.id AS course_id
       FROM manual_payment_receipts r
       JOIN courses c ON r.course_id = c.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
        [req.user!.id],
      );
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/receipts",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { courseId, receiptUrl, amountEtb, note } = req.body;
      const courseIdNumber = Number.parseInt(String(courseId), 10);
      if (!Number.isFinite(courseIdNumber) || courseIdNumber < 1) {
        return res.status(400).json({ error: "Valid course ID is required" });
      }
      if (!isAllowedReceiptFileUrl(receiptUrl)) {
        return res
          .status(400)
          .json({ error: "Upload a receipt image before submitting." });
      }
      const course = await pool.query(
        "SELECT id, title FROM courses WHERE id = $1",
        [courseIdNumber],
      );
      if (course.rows.length === 0)
        return res.status(404).json({ error: "Course not found" });

      let amount: number | null = null;
      if (amountEtb !== undefined && amountEtb !== null && amountEtb !== "") {
        amount = Number.parseFloat(String(amountEtb));
        if (!Number.isFinite(amount) || amount <= 0) {
          return res
            .status(400)
            .json({ error: "Amount must be a positive number" });
        }
      }
      const noteText =
        typeof note === "string" && note.trim()
          ? note.trim().slice(0, 2000)
          : null;
      const insert = await pool.query(
        `INSERT INTO manual_payment_receipts (user_id, course_id, receipt_image_url, amount_etb, note, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id, created_at`,
        [req.user!.id, courseIdNumber, receiptUrl, amount, noteText],
      );

      try {
        const user = await pool.query("SELECT name FROM users WHERE id = $1", [
          req.user!.id,
        ]);
        await analyticsService.createAdminNotification(
          "New manual payment receipt",
          `${user.rows[0]?.name || "A student"} submitted a receipt for "${course.rows[0].title}".`,
          "success",
          "/admin/payments",
        );
      } catch (notificationError) {
        console.error(
          "Failed to notify admins about manual receipt:",
          notificationError,
        );
      }

      res.status(201).json({
        success: true,
        id: insert.rows[0].id,
        created_at: insert.rows[0].created_at,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || "Failed to save receipt" });
    }
  },
);

router.get(
  "/receipts",
  authenticate,
  requireAdmin,
  async (_req: AuthRequest, res: Response) => {
    try {
      const result = await query(
        `SELECT r.id, r.receipt_image_url, r.amount_etb, r.note, r.status, r.created_at,
              r.reviewed_at, u.name AS user_name, u.email AS user_email,
              c.title AS course_title, c.id AS course_id
       FROM manual_payment_receipts r
       JOIN users u ON r.user_id = u.id
       JOIN courses c ON r.course_id = c.id
       ORDER BY r.created_at DESC LIMIT 200`,
      );
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/receipts/:id/approve",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const receipt = await client.query(
        `UPDATE manual_payment_receipts
       SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2
       WHERE id = $1 AND COALESCE(status, 'pending') = 'pending'
       RETURNING user_id, course_id, amount_etb`,
        [Number.parseInt(req.params.id, 10), req.user!.id],
      );
      if (receipt.rows.length === 0) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ error: "Receipt not found or already processed" });
      }
      const {
        user_id: userId,
        course_id: courseId,
        amount_etb: receiptAmount,
      } = receipt.rows[0];
      const course = await client.query(
        "SELECT title, price FROM courses WHERE id = $1",
        [courseId],
      );
      const coursePrice = Number(course.rows[0]?.price ?? 0);
      if (!Number.isFinite(coursePrice) || coursePrice <= 0) {
        throw new Error("Course has an invalid price");
      }
      const grossAmount = coursePrice;
      await client.query(
        `INSERT INTO payments
          (user_id, course_id, tx_ref, amount, currency, status, meta, completed_at, admin_share, instructor_share)
         VALUES ($1, $2, $3, $4, 'ETB', 'completed', $5, CURRENT_TIMESTAMP,
                 ROUND($4 * 0.20, 2), $4 - ROUND($4 * 0.20, 2))
         ON CONFLICT (tx_ref) DO NOTHING`,
        [
          userId,
          courseId,
          `manual-receipt-${req.params.id}`,
          grossAmount,
          JSON.stringify({
            source: "manual_receipt",
            receiptId: Number(req.params.id),
          }),
        ],
      );
      await client.query(
        "INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2) ON CONFLICT (user_id, course_id) DO NOTHING",
        [userId, courseId],
      );
      await client.query("COMMIT");

      try {
        const course = await query("SELECT title FROM courses WHERE id = $1", [
          courseId,
        ]);
        const courseTitle = course.rows[0]?.title || "your course";
        await analyticsService.createNotification(
          userId,
          "Payment request approved",
          `Your payment request for "${courseTitle}" has been approved. You can now access the course content.`,
          "success",
          "/notifications",
        );
      } catch (notificationError) {
        console.error(
          "Failed to notify student after approving payment:",
          notificationError,
        );
      }

      res.json({ success: true, enrolled: true });
    } catch (error: any) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  },
);

router.post(
  "/receipts/:id/reject",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const result = await query(
        `UPDATE manual_payment_receipts
         SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2
         WHERE id = $1 AND COALESCE(status, 'pending') = 'pending'
         RETURNING user_id, course_id`,
        [Number.parseInt(req.params.id, 10), req.user!.id],
      );
      if (result.rows.length === 0)
        return res
          .status(400)
          .json({ error: "Receipt not found or already processed" });

      const { user_id: userId, course_id: courseId } = result.rows[0];
      try {
        const course = await query("SELECT title FROM courses WHERE id = $1", [
          courseId,
        ]);
        const courseTitle = course.rows[0]?.title || "your course";
        await analyticsService.createNotification(
          userId,
          "Payment request declined",
          `Your payment request for "${courseTitle}" was declined. Please review the receipt and try again or contact support.`,
          "warning",
          "/notifications",
        );
      } catch (notificationError) {
        console.error(
          "Failed to notify student after rejecting payment:",
          notificationError,
        );
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
