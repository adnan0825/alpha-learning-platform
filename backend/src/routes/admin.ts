import { Router, Response } from "express";
import { authenticate, AuthRequest, requireAdmin } from "../middleware/auth";
import { query, pool } from "../config/db";
import { buildPublicUrl } from "../config/runtime";
import * as feedbackService from "../services/feedbackService";

const router = Router();

// ============================================
// PLATFORM SETTINGS
// ============================================

// GET /api/admin/settings - Get all settings (admin only)
router.get(
  "/settings",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      // Get platform statistics
      const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'instructor') as total_instructors,
        (SELECT COUNT(*) FROM courses) as total_courses,
        (SELECT COUNT(*) FROM courses WHERE is_published = true) as published_courses,
        (SELECT COUNT(*) FROM enrollments) as total_enrollments
    `);

      const settingsResult = await query(
        "SELECT key, value FROM settings WHERE key IN ($1, $2, $3)",
        ["appearance", "features", "faq"],
      );

      const settingsMap: Record<string, unknown> = {};
      settingsResult.rows.forEach((row: { key: string; value: unknown }) => {
        settingsMap[row.key] = row.value;
      });

      const defaultAppearance = {
        primaryColor: "#fbbf24",
        logo: "",
        fontFamily: "Inter",
        heroIntroVideoUrl: buildPublicUrl(
          "/api/uploads/video/1789914018184-7flk6bkl96.mp4",
        ),
      };

      const appearance = {
        ...defaultAppearance,
        ...((settingsMap.appearance as object) || {}),
      } as Record<string, unknown>;
      if (typeof appearance.heroIntroVideoUrl === "string") {
        const url = appearance.heroIntroVideoUrl.trim();
        appearance.heroIntroVideoUrl = /^https?:\/\//i.test(url)
          ? url
          : buildPublicUrl(url);
      }

      res.json({
        platform: stats.rows[0],
        appearance,
        features: settingsMap.features || {
          certificates_enabled: true,
          quizzes_enabled: true,
          discussions_enabled: true,
          max_file_size: 5 * 1024 * 1024, // 5MB
          allowed_file_types: [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
          ],
        },
        faq: Array.isArray(settingsMap.faq) ? settingsMap.faq : [],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// PUT /api/admin/settings - Update settings (admin only)
router.put(
  "/settings",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { appearance, features, faq } = req.body;
      let canonicalFaq:
        | Array<{
            id?: string;
            question: string;
            answer: string;
          }>
        | undefined;

      if (appearance) {
        await query(
          `
        INSERT INTO settings (key, value, updated_at) 
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
      `,
          ["appearance", appearance],
        );
      }

      if (features) {
        await query(
          `
        INSERT INTO settings (key, value, updated_at) 
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
      `,
          ["features", features],
        );
      }

      if (faq !== undefined) {
        if (!Array.isArray(faq)) {
          return res.status(400).json({ error: "FAQ must be an array" });
        }
        const invalidFaq = faq.find((item: unknown) => {
          if (!item || typeof item !== "object") return true;
          const entry = item as Record<string, unknown>;
          return ["question", "answer"].some(
            (field) => typeof entry[field] !== "string" || !entry[field].trim(),
          );
        });
        if (invalidFaq) {
          return res.status(400).json({
            error: "Each FAQ entry requires one question and one answer",
          });
        }
        canonicalFaq = faq.map(
          (item: { id?: unknown; question: string; answer: string }) => ({
            id: typeof item.id === "string" ? item.id : undefined,
            question: item.question.trim(),
            answer: item.answer.trim(),
          }),
        );
        await query(
          `
        INSERT INTO settings (key, value, updated_at) 
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
      `,
          ["faq", canonicalFaq],
        );
      }

      res.json({
        message: "Settings updated successfully",
        appearance,
        features,
        faq: faq === undefined ? undefined : canonicalFaq,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// SYSTEM LOGS
// ============================================

// GET /api/admin/logs - Get system logs (admin only)
router.get(
  "/logs",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { limit = 100, type = "all" } = req.query;

      // Query recent activities from various tables
      const logs = await query(
        `
      (SELECT 
        'user_created' as event_type,
        u.created_at as timestamp,
        json_build_object('user', u.name, 'email', u.email, 'role', u.role) as data
       FROM users u 
       ORDER BY u.created_at DESC 
       LIMIT $1)
      
      UNION ALL
      
      (SELECT 
        'course_created' as event_type,
        c.created_at as timestamp,
        json_build_object('course', c.title, 'instructor', u.name) as data
       FROM courses c
       JOIN users u ON c.instructor_id = u.id
       ORDER BY c.created_at DESC 
       LIMIT $1)
      
      UNION ALL
      
      (SELECT 
        'enrollment' as event_type,
        e.enrolled_at as timestamp,
        json_build_object('student', u.name, 'course', c.title) as data
       FROM enrollments e
       JOIN users u ON e.user_id = u.id
       JOIN courses c ON e.course_id = c.id
       ORDER BY e.enrolled_at DESC 
       LIMIT $1)
      
      ORDER BY timestamp DESC 
      LIMIT $1
    `,
        [parseInt(limit as string)],
      );

      res.json(logs.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// REPORTS
// ============================================

// GET /api/admin/revenue - Admin share and payment breakdown
router.get(
  "/revenue",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const [summary, courses] = await Promise.all([
        query(
          `SELECT
             COUNT(DISTINCT e.id) as enrolled_students,
             COALESCE(SUM(CASE WHEN e.id IS NOT NULL THEN c.price ELSE 0 END), 0) as gross_revenue,
             COALESCE(SUM(CASE WHEN e.id IS NOT NULL THEN ROUND(c.price * 0.20, 2) ELSE 0 END), 0) as admin_revenue,
             COALESCE(SUM(CASE WHEN e.id IS NOT NULL THEN c.price - ROUND(c.price * 0.20, 2) ELSE 0 END), 0) as instructor_revenue
           FROM courses c
           LEFT JOIN enrollments e ON e.course_id = c.id`,
          [],
        ),
        query(
          `SELECT
             c.id as course_id,
             c.title as course_title,
             u.name as instructor_name,
             COUNT(DISTINCT e.id) as enrolled_students,
             COALESCE(COUNT(DISTINCT e.id) * c.price, 0) as gross_revenue,
             COALESCE(COUNT(DISTINCT e.id) * ROUND(c.price * 0.20, 2), 0) as admin_revenue,
             COALESCE(COUNT(DISTINCT e.id) * (c.price - ROUND(c.price * 0.20, 2)), 0) as instructor_revenue
           FROM courses c
           JOIN users u ON u.id = c.instructor_id
             LEFT JOIN enrollments e ON e.course_id = c.id
           GROUP BY c.id, c.title, u.name
           ORDER BY admin_revenue DESC, c.title ASC`,
          [],
        ),
      ]);

      res.json({
        summary: summary.rows[0],
        courses: courses.rows,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// GET /api/admin/reports/overview - Platform overview report
router.get(
  "/reports/overview",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const requestedDays = Number.parseInt(
        String(req.query.period || "30"),
        10,
      );
      const days = [7, 30, 90, 365].includes(requestedDays)
        ? requestedDays
        : 30;

      // Get various metrics
      const [userGrowth, courseStats, revenueStats, activityStats] =
        await Promise.all([
          query(
            `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          role
        FROM users
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at), role
        ORDER BY date ASC
      `,
            [],
          ),
          query(
            `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_published = true) as published,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '${days} days') as new_courses,
          AVG(
            CASE
              WHEN duration ~ '^\\s*[0-9]+h'
                THEN (regexp_replace(duration, '^\\s*([0-9]+)h.*$', '\\1')::numeric * 60)
              ELSE 0
            END
            + CASE
                WHEN duration ~ '[0-9]+m'
                  THEN regexp_replace(duration, '^.*?([0-9]+)m.*$', '\\1')::numeric
                ELSE 0
              END
          ) as avg_duration_minutes
        FROM courses
      `,
            [],
          ),
          query(
            `
        SELECT 
          COUNT(*) as total_payments,
          COALESCE(SUM(amount), 0) as total_revenue,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as completed_revenue,
          COALESCE(SUM(COALESCE(admin_share, ROUND(amount * 0.20, 2))) FILTER (WHERE status = 'completed'), 0) as admin_revenue
        FROM payments
        WHERE created_at >= NOW() - INTERVAL '${days} days'
      `,
            [],
          ),
          query(
            `
        SELECT 
          COUNT(*) as total_enrollments,
          COUNT(DISTINCT user_id) as active_students,
          COUNT(DISTINCT course_id) as active_courses
        FROM enrollments
        WHERE enrolled_at >= NOW() - INTERVAL '${days} days'
      `,
            [],
          ),
        ]);

      res.json({
        period: `${days} days`,
        userGrowth: userGrowth.rows,
        courseStats: courseStats.rows[0],
        revenueStats: revenueStats.rows[0],
        activityStats: activityStats.rows[0],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// GET /api/admin/reports/users - User activity report
router.get(
  "/reports/users",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const users = await query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        COUNT(DISTINCT e.id) as enrollments,
        COUNT(DISTINCT c.id) as courses_created,
        COUNT(DISTINCT p.id) as lessons_completed
      FROM users u
      LEFT JOIN enrollments e ON u.id = e.user_id
      LEFT JOIN courses c ON u.id = c.instructor_id
      LEFT JOIN progress p ON u.id = p.user_id AND p.completed = true
      GROUP BY u.id, u.name, u.email, u.role, u.created_at
      ORDER BY u.created_at DESC
    `);

      res.json(users.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// GET /api/admin/reports/courses - Course performance report
router.get(
  "/reports/courses",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const courses = await query(`
      SELECT 
        c.id,
        c.title,
        c.category,
        c.difficulty,
        c.is_published,
        c.enrolled_count,
        c.price,
        u.name as instructor_name,
        c.created_at,
        COUNT(DISTINCT e.id) as actual_enrollments,
        AVG(r.rating) as average_rating,
        COUNT(DISTINCT r.id) as review_count
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      LEFT JOIN reviews r ON c.id = r.course_id
      GROUP BY c.id, c.title, c.category, c.difficulty, c.is_published, 
               c.enrolled_count, c.price, u.name, c.created_at
      ORDER BY c.created_at DESC
    `);

      res.json(courses.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// CONTENT MODERATION
// ============================================

// GET /api/admin/moderation/discussions - Get all discussions for moderation
router.get(
  "/moderation/discussions",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const requestedLimit = Number.parseInt(
        String(req.query.limit || "50"),
        10,
      );
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(requestedLimit, 1), 100)
        : 50;
      const requestedCourse = req.query.course
        ? Number.parseInt(String(req.query.course), 10)
        : undefined;
      if (requestedCourse !== undefined && !Number.isFinite(requestedCourse)) {
        return res.status(400).json({ error: "Invalid course id" });
      }
      const courseFilter = requestedCourse ? "AND d.course_id = $2" : "";

      const discussions = await query(
        `
      SELECT 
        d.*,
        c.title as course_title,
        u.name as user_name,
        u.email as user_email
      FROM discussions d
      JOIN courses c ON d.course_id = c.id
      JOIN users u ON d.user_id = u.id
      WHERE 1=1 ${courseFilter}
      ORDER BY d.created_at DESC
      LIMIT $1
    `,
        requestedCourse ? [limit, requestedCourse] : [limit],
      );

      res.json(discussions.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// DELETE /api/admin/moderation/discussions/:id - Delete discussion
router.delete(
  "/moderation/discussions/:id",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const discussionId = parseInt(req.params.id, 10);
      if (!Number.isFinite(discussionId)) {
        return res.status(400).json({ error: "Invalid discussion id" });
      }
      const result = await query(
        "DELETE FROM discussions WHERE id = $1 RETURNING id",
        [discussionId],
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Discussion not found" });
      }
      res.json({ success: true, message: "Discussion deleted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// GET /api/admin/moderation/reviews - Get all reviews for moderation
router.get(
  "/moderation/reviews",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const reviews = await query(`
      SELECT 
        r.*,
        c.title as course_title,
        u.name as user_name,
        u.email as user_email
      FROM reviews r
      JOIN courses c ON r.course_id = c.id
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
      LIMIT 50
    `);

      res.json(reviews.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// DELETE /api/admin/moderation/reviews/:id - Delete review
router.delete(
  "/moderation/reviews/:id",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const reviewId = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(reviewId)) {
        return res.status(400).json({ error: "Invalid review id" });
      }
      const result = await query(
        "DELETE FROM reviews WHERE id = $1 RETURNING id",
        [reviewId],
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Review not found" });
      }
      res.json({ success: true, message: "Review deleted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// USER FEEDBACK / QUESTIONS
// ============================================

router.get(
  "/feedback",
  authenticate,
  requireAdmin,
  async (_req: AuthRequest, res: Response) => {
    try {
      const rows = await feedbackService.listFeedbackForAdmin();
      res.json(
        rows.map((r: any) => ({
          id: String(r.id),
          userId: r.user_id ? String(r.user_id) : null,
          userName:
            r.user_name || (r.user_id ? "Registered user" : "Guest visitor"),
          userRole: r.user_role || null,
          userEmail: r.user_email || null,
          subject: r.subject,
          message: r.message,
          adminReply: r.admin_reply,
          repliedAt: r.replied_at,
          createdAt: r.created_at,
        })),
      );
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.patch(
  "/feedback/:id/reply",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { reply } = req.body;
      if (!reply || typeof reply !== "string") {
        return res.status(400).json({ error: "Reply is required" });
      }
      const row = await feedbackService.replyToFeedback(id, reply);
      res.json({
        id: String(row.id),
        userId: row.user_id ? String(row.user_id) : null,
        subject: row.subject,
        message: row.message,
        adminReply: row.admin_reply,
        repliedAt: row.replied_at,
        createdAt: row.created_at,
      });
    } catch (error: any) {
      res
        .status(error.message === "Feedback not found" ? 404 : 400)
        .json({ error: error.message });
    }
  },
);

router.delete(
  "/feedback/:id",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: "Invalid id" });
      }
      await feedbackService.deleteFeedback(id);
      res.json({ success: true });
    } catch (error: any) {
      res
        .status(error.message === "Feedback not found" ? 404 : 500)
        .json({ error: error.message });
    }
  },
);

export default router;
