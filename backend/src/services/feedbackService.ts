import { query } from "../config/db";
import { createNotification } from "./analyticsService";

export async function submitFeedback(
  userId: number | undefined,
  subject: string | undefined,
  message: string,
) {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error("Message is required");
  }

  const result = await query(
    `INSERT INTO user_feedback (user_id, subject, message) VALUES ($1, $2, $3) RETURNING *`,
    [userId || null, subject?.trim() || null, trimmed],
  );
  const row = result.rows[0];

  if (userId) {
    const userRes = await query("SELECT name, email FROM users WHERE id = $1", [
      userId,
    ]);
    const u = userRes.rows[0];
    const preview =
      trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed;

    const admins = await query(`SELECT id FROM users WHERE role = 'admin'`);
    for (const admin of admins.rows) {
      await createNotification(
        admin.id,
        `Question from ${u?.name || "User"}`,
        preview,
        "info",
        "/admin/dashboard?tab=feedback",
      );
    }
  }

  return row;
}

export async function listFeedbackForAdmin() {
  const result = await query(
    `SELECT f.*, u.name AS user_name, u.email AS user_email
     FROM user_feedback f
     JOIN users u ON f.user_id = u.id
     ORDER BY f.created_at DESC`,
  );
  return result.rows;
}

export async function replyToFeedback(feedbackId: number, reply: string) {
  const trimmed = reply.trim();
  if (!trimmed) {
    throw new Error("Reply is required");
  }

  const result = await query(
    `UPDATE user_feedback
     SET admin_reply = $2, replied_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [feedbackId, trimmed],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("Feedback not found");
  }

  const preview = trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
  await createNotification(
    row.user_id,
    "Reply from Alpha Support",
    preview,
    "info",
    "/notifications",
  );

  return row;
}

export async function deleteFeedback(feedbackId: number) {
  const result = await query(
    "DELETE FROM user_feedback WHERE id = $1 RETURNING id",
    [feedbackId],
  );
  if (result.rowCount === 0) {
    throw new Error("Feedback not found");
  }
}
