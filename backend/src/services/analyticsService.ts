import { query } from "../config/db";

// ============================================
// BOOKMARKS
// ============================================

export const getBookmarks = async (userId: number) => {
  const result = await query(
    `SELECT b.*, c.title, c.description, c.thumbnail, c.category, c.difficulty,
            u.name as instructor_name
     FROM bookmarks b 
     JOIN courses c ON b.course_id = c.id
     JOIN users u ON c.instructor_id = u.id
     WHERE b.user_id = $1 
     ORDER BY b.created_at DESC`,
    [userId],
  );
  return result.rows;
};

export const addBookmark = async (userId: number, courseId: number) => {
  const result = await query(
    "INSERT INTO bookmarks (user_id, course_id) VALUES ($1, $2) ON CONFLICT (user_id, course_id) DO NOTHING RETURNING *",
    [userId, courseId],
  );
  return result.rows[0];
};

export const removeBookmark = async (userId: number, courseId: number) => {
  await query("DELETE FROM bookmarks WHERE user_id = $1 AND course_id = $2", [
    userId,
    courseId,
  ]);
  return { success: true };
};

export const isBookmarked = async (userId: number, courseId: number) => {
  const result = await query(
    "SELECT * FROM bookmarks WHERE user_id = $1 AND course_id = $2",
    [userId, courseId],
  );
  return result.rows.length > 0;
};

// ============================================
// NOTIFICATIONS
// ============================================

export const getNotifications = async (userId: number, unreadOnly = false) => {
  const unreadCondition = unreadOnly ? "AND read = false" : "";
  const result = await query(
    `SELECT * FROM notifications 
     WHERE user_id = $1 ${unreadCondition}
     ORDER BY created_at DESC 
     LIMIT 50`,
    [userId],
  );
  return result.rows;
};

export const markNotificationAsRead = async (
  userId: number,
  notificationId: number,
) => {
  const result = await query(
    "UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *",
    [notificationId, userId],
  );
  return result.rows[0];
};

export const markAllNotificationsAsRead = async (userId: number) => {
  await query("UPDATE notifications SET read = true WHERE user_id = $1", [
    userId,
  ]);
  return { success: true };
};

export const createNotification = async (
  userId: number,
  title: string,
  message: string,
  type: string = "info",
  link?: string,
) => {
  const result = await query(
    "INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [userId, title, message, type, link],
  );
  return result.rows[0];
};

export const deleteNotification = async (
  userId: number,
  notificationId: number,
) => {
  await query("DELETE FROM notifications WHERE id = $1 AND user_id = $2", [
    notificationId,
    userId,
  ]);
  return { success: true };
};

export const createAdminNotification = async (
  title: string,
  message: string,
  type: string = "info",
  link?: string,
) => {
  // Get all admin users
  const admins = await query("SELECT id FROM users WHERE role = 'admin'");

  // Create a notification for each admin
  const promises = admins.rows.map((admin: { id: number }) =>
    createNotification(admin.id, title, message, type, link),
  );

  return Promise.all(promises);
};

export const getUnreadNotificationCount = async (userId: number) => {
  const result = await query(
    "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false",
    [userId],
  );
  return parseInt(result.rows[0].count);
};

// ============================================
// COURSE NOTES
// ============================================

export const getCourseNotes = async (userId: number, courseId?: number) => {
  const courseCondition = courseId ? "AND course_id = $2" : "";
  const params = courseId ? [userId, courseId] : [userId];

  const result = await query(
    `SELECT cn.*, c.title as course_title 
     FROM course_notes cn 
     JOIN courses c ON cn.course_id = c.id
     WHERE cn.user_id = $1 ${courseCondition}
     ORDER BY cn.created_at DESC`,
    params,
  );
  return result.rows;
};

export const createNote = async (
  userId: number,
  courseId: number,
  content: string,
  lessonIndex?: number,
  lessonTitle?: string,
) => {
  const result = await query(
    "INSERT INTO course_notes (user_id, course_id, lesson_index, lesson_title, content) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [userId, courseId, lessonIndex || null, lessonTitle || null, content],
  );
  return result.rows[0];
};

export const updateNote = async (
  userId: number,
  noteId: number,
  content: string,
) => {
  const result = await query(
    "UPDATE course_notes SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *",
    [content, noteId, userId],
  );
  return result.rows[0];
};

export const deleteNote = async (userId: number, noteId: number) => {
  await query("DELETE FROM course_notes WHERE id = $1 AND user_id = $2", [
    noteId,
    userId,
  ]);
  return { success: true };
};

// ============================================
// ANNOUNCEMENTS
// ============================================

export const getAnnouncements = async (courseId: number) => {
  const result = await query(
    `SELECT a.*, u.name as instructor_name, u.avatar as instructor_avatar
     FROM announcements a 
     JOIN users u ON a.instructor_id = u.id
     WHERE a.course_id = $1 
     ORDER BY a.is_pinned DESC, a.created_at DESC`,
    [courseId],
  );
  return result.rows;
};

export const createAnnouncement = async (
  instructorId: number,
  courseId: number,
  title: string,
  content: string,
  isPinned = false,
) => {
  const result = await query(
    "INSERT INTO announcements (instructor_id, course_id, title, content, is_pinned) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [instructorId, courseId, title, content, isPinned],
  );
  return result.rows[0];
};

export const updateAnnouncement = async (
  instructorId: number,
  announcementId: number,
  title?: string,
  content?: string,
  isPinned?: boolean,
) => {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(title);
  }
  if (content !== undefined) {
    updates.push(`content = $${paramIndex++}`);
    values.push(content);
  }
  if (isPinned !== undefined) {
    updates.push(`is_pinned = $${paramIndex++}`);
    values.push(isPinned);
  }

  if (updates.length === 0) {
    throw new Error("No updates provided");
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(instructorId, announcementId);

  const result = await query(
    `UPDATE announcements SET ${updates.join(", ")} WHERE id = $${paramIndex + 1} AND instructor_id = $${paramIndex} RETURNING *`,
    values,
  );
  return result.rows[0];
};

export const deleteAnnouncement = async (
  instructorId: number,
  announcementId: number,
) => {
  await query(
    "DELETE FROM announcements WHERE id = $1 AND instructor_id = $2",
    [announcementId, instructorId],
  );
  return { success: true };
};

// ============================================
// LEARNING PATHS
// ============================================

export const getLearningPaths = async (isActive = true) => {
  const result = await query(
    `SELECT lp.*, u.name as created_by_name,
            COUNT(lpc.course_id) as course_count
     FROM learning_paths lp
     LEFT JOIN users u ON lp.created_by = u.id
     LEFT JOIN learning_path_courses lpc ON lp.id = lpc.learning_path_id
     WHERE lp.is_active = $1
     GROUP BY lp.id, u.name
     ORDER BY lp.created_at DESC`,
    [isActive],
  );
  return result.rows;
};

export const getLearningPathById = async (pathId: number) => {
  const result = await query(
    `SELECT lp.*, u.name as created_by_name
     FROM learning_paths lp
     LEFT JOIN users u ON lp.created_by = u.id
     WHERE lp.id = $1`,
    [pathId],
  );
  return result.rows[0];
};

export const getLearningPathCourses = async (pathId: number) => {
  const result = await query(
    `SELECT lpc.*, c.title, c.description, c.thumbnail, c.category, c.difficulty,
            u.name as instructor_name
     FROM learning_path_courses lpc
     JOIN courses c ON lpc.course_id = c.id
     JOIN users u ON c.instructor_id = u.id
     WHERE lpc.learning_path_id = $1
     ORDER BY lpc.position ASC`,
    [pathId],
  );
  return result.rows;
};

export const createLearningPath = async (
  title: string,
  description: string,
  createdBy: number,
  courseIds: number[] = [],
) => {
  const pathResult = await query(
    "INSERT INTO learning_paths (title, description, created_by, is_active) VALUES ($1, $2, $3, true) RETURNING *",
    [title, description, createdBy],
  );
  const path = pathResult.rows[0];

  // Add courses to the path
  for (let i = 0; i < courseIds.length; i++) {
    await query(
      "INSERT INTO learning_path_courses (learning_path_id, course_id, position) VALUES ($1, $2, $3)",
      [path.id, courseIds[i], i],
    );
  }

  return path;
};

export const updateLearningPath = async (
  pathId: number,
  title?: string,
  description?: string,
  isActive?: boolean,
) => {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(title);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(description);
  }
  if (isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(isActive);
  }

  if (updates.length === 0) {
    throw new Error("No updates provided");
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(pathId);

  const result = await query(
    `UPDATE learning_paths SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
    values,
  );
  return result.rows[0];
};

export const deleteLearningPath = async (pathId: number) => {
  await query("DELETE FROM learning_path_courses WHERE learning_path_id = $1", [
    pathId,
  ]);
  await query("DELETE FROM learning_paths WHERE id = $1", [pathId]);
  return { success: true };
};

export const addCourseToPath = async (
  pathId: number,
  courseId: number,
  position: number,
) => {
  const result = await query(
    "INSERT INTO learning_path_courses (learning_path_id, course_id, position) VALUES ($1, $2, $3) ON CONFLICT (learning_path_id, course_id) DO UPDATE SET position = $3 RETURNING *",
    [pathId, courseId, position],
  );
  return result.rows[0];
};

export const removeCourseFromPath = async (
  pathId: number,
  courseId: number,
) => {
  await query(
    "DELETE FROM learning_path_courses WHERE learning_path_id = $1 AND course_id = $2",
    [pathId, courseId],
  );
  return { success: true };
};

// ============================================
// USER LEARNING PATHS (Progress Tracking)
// ============================================

export const getUserLearningPaths = async (userId: number) => {
  const result = await query(
    `SELECT ulp.*, lp.title, lp.description, lp.course_count,
            COUNT(lpc.course_id) as completed_courses
     FROM user_learning_paths ulp
     JOIN learning_paths lp ON ulp.learning_path_id = lp.id
     LEFT JOIN learning_path_courses lpc ON lp.id = lpc.learning_path_id
     LEFT JOIN enrollments e ON e.user_id = ulp.user_id AND e.course_id = lpc.course_id
     LEFT JOIN progress p ON p.user_id = ulp.user_id AND p.completed = true
     WHERE ulp.user_id = $1
     GROUP BY ulp.id, lp.title, lp.description, lp.course_count
     ORDER BY ulp.started_at DESC`,
    [userId],
  );
  return result.rows;
};

export const enrollInLearningPath = async (userId: number, pathId: number) => {
  const result = await query(
    "INSERT INTO user_learning_paths (user_id, learning_path_id) VALUES ($1, $2) ON CONFLICT (user_id, learning_path_id) DO NOTHING RETURNING *",
    [userId, pathId],
  );
  return result.rows[0];
};

export const updateLearningPathProgress = async (
  userId: number,
  pathId: number,
  progress: number,
) => {
  const result = await query(
    "UPDATE user_learning_paths SET progress = $1, completed_at = CASE WHEN $1 >= 100 THEN CURRENT_TIMESTAMP ELSE completed_at END WHERE user_id = $2 AND learning_path_id = $3 RETURNING *",
    [progress, userId, pathId],
  );
  return result.rows[0];
};

// ============================================
// LEADERBOARD
// ============================================

export const getLeaderboard = async (limit = 50) => {
  const result = await query(
    `SELECT * FROM leaderboard 
     ORDER BY courses_completed DESC, lessons_completed DESC, certificates_earned DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
};

// ============================================
// INSTRUCTOR ANALYTICS
// ============================================

export const getInstructorRevenue = async (
  instructorId: number,
  courseId?: number,
) => {
  const courseCondition = courseId ? "AND course_id = $2" : "";
  const params = courseId ? [instructorId, courseId] : [instructorId];

  const result = await query(
    `SELECT * FROM instructor_revenue 
     WHERE instructor_id = $1 ${courseCondition}
     ORDER BY total_revenue DESC`,
    params,
  );
  return result.rows;
};

export const getInstructorStats = async (instructorId: number) => {
  const result = await query(
    `SELECT 
        COUNT(DISTINCT c.id) as total_courses,
        COUNT(DISTINCT e.id) as total_enrollments,
        COUNT(DISTINCT r.id) as total_reviews,
        AVG(r.rating) as average_rating,
        COUNT(DISTINCT CASE WHEN c.is_published = true THEN c.id END) as published_courses,
        COUNT(DISTINCT CASE WHEN c.is_published = false THEN c.id END) as draft_courses
     FROM courses c
     LEFT JOIN enrollments e ON c.id = e.course_id
     LEFT JOIN reviews r ON c.id = r.course_id
     WHERE c.instructor_id = $1`,
    [instructorId],
  );
  return result.rows[0];
};

export const getQuizStatistics = async (courseId: number) => {
  const result = await query(
    `SELECT * FROM quiz_statistics WHERE course_id = $1`,
    [courseId],
  );
  return result.rows;
};

export const getStudentGrades = async (
  instructorId: number,
  courseId: number,
) => {
  const result = await query(
    `SELECT 
        u.id as student_id,
        u.name as student_name,
        u.email as student_email,
        u.avatar as student_avatar,
        q.id as quiz_id,
        q.title as quiz_title,
        COALESCE(MAX(qr.score), 0) as highest_score,
        COALESCE(MIN(qr.score), 0) as lowest_score,
        COALESCE(AVG(qr.score), 0) as average_score,
        COUNT(qr.id) as attempts
     FROM users u
     JOIN enrollments e ON u.id = e.user_id
     JOIN courses c ON e.course_id = c.id
     LEFT JOIN quizzes q ON q.course_id = c.id
     LEFT JOIN quiz_results qr ON qr.quiz_id = q.id AND qr.student_id = u.id
     WHERE c.id = $1 AND c.instructor_id = $2
     GROUP BY u.id, u.name, u.email, u.avatar, q.id, q.title
     ORDER BY u.name, q.title`,
    [courseId, instructorId],
  );
  return result.rows;
};
