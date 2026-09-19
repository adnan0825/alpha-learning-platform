import { query } from "../config/db";

export const enrollUser = async (userId: number, courseId: number) => {
  const result = await query(
    "INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2) RETURNING *",
    [userId, courseId],
  );
  const row = result.rows[0];
  return {
    id: String(row.id),
    studentId: String(row.user_id),
    courseId: String(row.course_id),
    progress: row.progress || 0,
    completedVideos: row.completed_videos || [],
    enrolledAt: row.enrolled_at,
  };
};

export const getUserEnrollments = async (userId: number) => {
  const result = await query(
    `SELECT e.*, c.title as course_title, c.thumbnail as course_thumbnail, c.price as course_price
     FROM enrollments e JOIN courses c ON e.course_id = c.id
     WHERE e.user_id = $1 ORDER BY e.enrolled_at DESC`,
    [userId],
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    studentId: String(row.user_id),
    courseId: String(row.course_id),
    progress: row.progress || 0,
    completedVideos: row.completed_videos || [],
    enrolledAt: row.enrolled_at,
    courseTitle: row.course_title,
    courseThumbnail: row.course_thumbnail,
    coursePrice: row.course_price,
  }));
};

export const getCourseEnrollments = async (courseId: number) => {
  const result = await query(
    `SELECT e.*, u.name as user_name, u.email as user_email
     FROM enrollments e JOIN users u ON e.user_id = u.id
     WHERE e.course_id = $1 ORDER BY e.enrolled_at DESC`,
    [courseId],
  );
  return result.rows;
};

export const isEnrolled = async (userId: number, courseId: number) => {
  const result = await query(
    "SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2",
    [userId, courseId],
  );
  return result.rows.length > 0;
};

export const updateEnrollmentProgress = async (
  userId: number,
  enrollmentId: number,
  completedVideos: string[],
) => {
  const result = await query(
    `SELECT e.id, e.user_id, e.course_id, e.enrolled_at,
            c.intro_video_url, c.video_links
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     WHERE e.id = $1 AND e.user_id = $2`,
    [enrollmentId, userId],
  );
  const enrollment = result.rows[0];
  if (!enrollment) return null;

  const videoLinks = Array.isArray(enrollment.video_links)
    ? enrollment.video_links
    : [];
  const orderedVideos =
    typeof enrollment.intro_video_url === "string" &&
    enrollment.intro_video_url.trim()
      ? [{ url: enrollment.intro_video_url }, ...videoLinks]
      : videoLinks;
  const watchedResult = await query(
    `SELECT video_index FROM video_watch_progress
     WHERE enrollment_id = $1 AND completed = true`,
    [enrollment.id],
  );
  const watchedIndexes = new Set(
    watchedResult.rows.map((row) => Number(row.video_index)),
  );
  const totalLessons =
    (typeof enrollment.intro_video_url === "string" &&
    enrollment.intro_video_url.trim()
      ? 1
      : 0) + videoLinks.length;
  const validCompletedVideos = Array.from(
    new Set(
      completedVideos.filter((key) => {
        const match = /^video_(\d+)$/.exec(key);
        if (!match) return false;
        const index = Number(match[1]);
        if (index < 0 || index >= totalLessons) return false;
        return (
          !String(orderedVideos[index]?.url || "").trim() ||
          watchedIndexes.has(index)
        );
      }),
    ),
  );
  const progress = totalLessons
    ? Math.round((validCompletedVideos.length / totalLessons) * 100)
    : 0;

  const updated = await query(
    `UPDATE enrollments
     SET completed_videos = $1::jsonb,
         progress = $2,
         completed_at = CASE WHEN $2 = 100 THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    [JSON.stringify(validCompletedVideos), progress, enrollmentId, userId],
  );
  const row = updated.rows[0];
  return {
    id: String(row.id),
    studentId: String(row.user_id),
    courseId: String(row.course_id),
    progress: row.progress || 0,
    completedVideos: row.completed_videos || [],
    enrolledAt: row.enrolled_at,
  };
};

export const completeEnrollment = async (userId: number, courseId: number) => {
  const result = await query(
    "UPDATE enrollments SET completed_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND course_id = $2 RETURNING *",
    [userId, courseId],
  );
  return result.rows[0];
};

export const createReview = async (
  userId: number,
  courseId: number,
  rating: number,
  comment?: string,
) => {
  const result = await query(
    "INSERT INTO reviews (user_id, course_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *",
    [userId, courseId, rating, comment],
  );
  return result.rows[0];
};

export const getCourseReviews = async (courseId: number) => {
  const result = await query(
    `SELECT r.*, u.name as user_name, u.avatar as user_avatar
     FROM reviews r JOIN users u ON r.user_id = u.id
     WHERE r.course_id = $1 ORDER BY r.created_at DESC`,
    [courseId],
  );
  return result.rows;
};

export const getCourseRating = async (courseId: number) => {
  const result = await query(
    "SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE course_id = $1",
    [courseId],
  );
  return result.rows[0];
};
