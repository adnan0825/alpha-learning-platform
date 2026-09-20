import { query } from "../config/db";
import {
  createAdminNotification,
  createNotification,
} from "./analyticsService";

const formatRoleLabel = (role?: string | null) => {
  if (!role) return "Guest";
  const normalized = role.toLowerCase();
  if (normalized === "student") return "Student";
  if (normalized === "instructor") return "Instructor";
  if (normalized === "admin") return "Admin";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

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

  const userRes = userId
    ? await query("SELECT name, email, role FROM users WHERE id = $1", [userId])
    : { rows: [] };
  const u = userRes.rows[0];
  const preview = trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed;
  const senderLabel = userId
    ? `${u?.name || "User"} (${formatRoleLabel(u?.role)})`
    : "Guest visitor";

  await createAdminNotification(
    `New support request from ${senderLabel}`,
    `${subject?.trim() ? `${subject.trim()} — ` : ""}${preview}`,
    "info",
    "/admin/dashboard?tab=feedback",
  );

  if (userId) {
    await createNotification(
      userId,
      "Support request received",
      "Your support message has been sent to the admin team.",
      "info",
      "/notifications",
    );
  }

  return row;
}

export async function listFeedbackForAdmin() {
  const result = await query(
    `SELECT f.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
     FROM user_feedback f
     LEFT JOIN users u ON f.user_id = u.id
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
  if (row.user_id) {
    await createNotification(
      row.user_id,
      "Reply from Alpha Support",
      preview,
      "info",
      "/notifications",
    );
  }

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
