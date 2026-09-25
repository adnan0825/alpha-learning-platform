import { query } from "../config/db";
import { autoIssue } from "./certificateService";

type CourseVideo = { url?: unknown; duration?: unknown };

function orderedVideos(course: any): CourseVideo[] {
  const links = Array.isArray(course.video_links)
    ? course.video_links
    : typeof course.video_links === "string"
      ? JSON.parse(course.video_links || "[]")
      : [];
  const normalized = Array.isArray(links) ? links : [];
  return course.intro_video_url?.trim()
    ? [{ url: course.intro_video_url }, ...normalized]
    : normalized;
}

function parseDuration(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0)
    return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const parts = value.trim().split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

export function getVideoCompletionThreshold(durationSeconds: number): number {
  const safeDuration = Math.max(0, Number(durationSeconds) || 0);
  return safeDuration > 0 ? safeDuration * 0.9 : 0;
}

export function isVideoCompletionReached({
  watchedSeconds,
  durationSeconds,
  positionSeconds,
  ended = false,
}: {
  watchedSeconds: number;
  durationSeconds: number;
  positionSeconds: number;
  ended?: boolean;
}): boolean {
  const safeDuration = Math.max(0, Number(durationSeconds) || 0);
  if (safeDuration <= 0) return false;

  const safeWatched = Math.max(0, Number(watchedSeconds) || 0);
  const safePosition = Math.min(
    Math.max(0, Number(positionSeconds) || 0),
    safeDuration,
  );
  const requiredWatchedSeconds = getVideoCompletionThreshold(safeDuration);
  const hasReachedProgressThreshold =
    ended || safePosition >= safeDuration * 0.9;

  return safeWatched >= requiredWatchedSeconds && hasReachedProgressThreshold;
}

async function getEnrollmentCourse(userId: number, courseId: number) {
  const result = await query(
    `SELECT e.id, e.completed_videos, c.intro_video_url, c.video_links
     FROM enrollments e JOIN courses c ON c.id = e.course_id
     WHERE e.user_id = $1 AND e.course_id = $2`,
    [userId, courseId],
  );
  return result.rows[0];
}

async function syncEnrollmentCompletion(
  userId: number,
  courseId: number,
  enrollment: any,
  videoIndex: number,
) {
  const videos = orderedVideos(enrollment);
  const completed = new Set<string>(
    Array.isArray(enrollment.completed_videos)
      ? enrollment.completed_videos.filter(
          (key: unknown): key is string => typeof key === "string",
        )
      : [],
  );
  completed.add(`video_${videoIndex}`);

  const watched = await query(
    `SELECT video_index FROM video_watch_progress
     WHERE enrollment_id = $1 AND completed = true`,
    [enrollment.id],
  );
  const watchedIndexes = new Set(
    watched.rows.map((row) => Number(row.video_index)),
  );
  const validCompleted = Array.from(completed).filter((key) => {
    const match = /^video_(\d+)$/.exec(key);
    if (!match) return false;
    const index = Number(match[1]);
    return (
      index >= 0 &&
      index < videos.length &&
      (!String(videos[index]?.url || "").trim() || watchedIndexes.has(index))
    );
  });
  const percentage = videos.length
    ? Math.round((validCompleted.length / videos.length) * 100)
    : 0;
  const updated = await query(
    `UPDATE enrollments
     SET completed_videos = $1::jsonb,
         progress = $2,
         completed_at = CASE WHEN $2 = 100 THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    [JSON.stringify(validCompleted), percentage, enrollment.id, userId],
  );
  if (percentage === 100) {
    try {
      await autoIssue(userId, courseId);
    } catch (error) {
      console.error("Certificate auto-issuance failed:", error);
    }
  }
  const row = updated.rows[0];
  return {
    id: String(row.id),
    studentId: String(row.user_id),
    courseId: String(row.course_id),
    progress: row.progress || 0,
    completedVideos: row.completed_videos || [],
    enrolledAt: row.enrolled_at,
  };
}

export const getCourseVideoWatchProgress = async (
  userId: number,
  courseId: number,
) => {
  const enrollment = await getEnrollmentCourse(userId, courseId);
  if (!enrollment) throw new Error("Enrollment not found");
  const result = await query(
    `SELECT video_index, watched_seconds, duration_seconds, last_position_seconds,
            completed, last_seen_at
     FROM video_watch_progress WHERE enrollment_id = $1 ORDER BY video_index`,
    [enrollment.id],
  );
  return result.rows.map((row) => ({
    videoIndex: Number(row.video_index),
    watchedSeconds: Number(row.watched_seconds),
    durationSeconds: Number(row.duration_seconds),
    lastPositionSeconds: Number(row.last_position_seconds),
    completed: Boolean(row.completed),
    lastSeenAt: row.last_seen_at,
  }));
};

export const recordVideoWatchProgress = async (
  userId: number,
  courseId: number,
  videoIndex: number,
  positionSeconds: number,
  reportedDurationSeconds: number,
  playing: boolean,
  ended: boolean,
) => {
  const enrollment = await getEnrollmentCourse(userId, courseId);
  if (!enrollment) throw new Error("Enrollment not found");
  const videos = orderedVideos(enrollment);
  const video = videos[videoIndex];
  if (!video) throw new Error("Invalid lesson video");
  if (!String(video.url || "").trim())
    throw new Error("This lesson has no video");
  if (
    !Number.isFinite(positionSeconds) ||
    !Number.isFinite(reportedDurationSeconds) ||
    reportedDurationSeconds <= 0
  ) {
    throw new Error("Valid video playback data is required");
  }

  const existingResult = await query(
    "SELECT * FROM video_watch_progress WHERE enrollment_id = $1 AND video_index = $2",
    [enrollment.id, videoIndex],
  );
  const existing = existingResult.rows[0];
  const expectedDuration =
    parseDuration(video.duration) ||
    (existing ? Number(existing.duration_seconds) : reportedDurationSeconds);
  const duration = Math.max(1, expectedDuration);
  const position = Math.max(0, Math.min(positionSeconds, duration));
  const previousWatched = existing ? Number(existing.watched_seconds) : 0;
  const elapsed = existing
    ? Math.min(
        15,
        Math.max(
          0,
          (Date.now() - new Date(existing.last_seen_at).getTime()) / 1000,
        ),
      )
    : 0;
  const maxCreditableAdvance = elapsed * 1.5 + 1.5;
  const contiguousAdvance = position - previousWatched;
  const credited =
    playing &&
    contiguousAdvance > 0 &&
    contiguousAdvance <= maxCreditableAdvance
      ? Math.min(contiguousAdvance, maxCreditableAdvance)
      : 0;
  const watchedSeconds = Math.min(duration, previousWatched + credited);
  const completed =
    Boolean(existing?.completed) ||
    isVideoCompletionReached({
      watchedSeconds,
      durationSeconds: duration,
      positionSeconds: position,
      ended,
    });
  const result = await query(
    `INSERT INTO video_watch_progress
       (enrollment_id, video_index, watched_seconds, duration_seconds, last_position_seconds, completed, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
     ON CONFLICT (enrollment_id, video_index) DO UPDATE SET
       watched_seconds = GREATEST(video_watch_progress.watched_seconds, EXCLUDED.watched_seconds),
       duration_seconds = EXCLUDED.duration_seconds,
       last_position_seconds = EXCLUDED.last_position_seconds,
       completed = video_watch_progress.completed OR EXCLUDED.completed,
       last_seen_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [enrollment.id, videoIndex, watchedSeconds, duration, position, completed],
  );
  const row = result.rows[0];
  const updatedEnrollment = completed
    ? await syncEnrollmentCompletion(userId, courseId, enrollment, videoIndex)
    : undefined;
  return {
    videoIndex,
    watchedSeconds: Number(row.watched_seconds),
    durationSeconds: Number(row.duration_seconds),
    lastPositionSeconds: Number(row.last_position_seconds),
    completed: Boolean(row.completed),
    enrollment: updatedEnrollment,
  };
};

export const markLessonComplete = async (userId: number, lessonId: number) => {
  const lessonResult = await query(
    `SELECT l.id, l.video_url, m.course_id
     FROM lessons l JOIN modules m ON m.id = l.module_id
     WHERE l.id = $1`,
    [lessonId],
  );
  if (lessonResult.rows.length === 0) throw new Error("Lesson not found");
  if (String(lessonResult.rows[0].video_url || "").trim()) {
    throw new Error("Video lessons must be completed through watched playback");
  }
  const courseId = Number(lessonResult.rows[0].course_id);
  const enrollment = await query(
    "SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2",
    [userId, courseId],
  );
  if (enrollment.rows.length === 0) throw new Error("Enrollment not found");

  const result = await query(
    `INSERT INTO progress (user_id, lesson_id, completed, completed_at)
     VALUES ($1, $2, true, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, lesson_id) DO UPDATE SET completed = true, completed_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, lessonId],
  );

  // Derive courseId from the lesson record (lessons → modules → course_id)
  {
    const { percentage } = await getCourseProgress(userId, courseId);
    await query(
      `UPDATE enrollments
       SET progress = $1,
           completed_at = CASE WHEN $1 = 100 THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END
       WHERE user_id = $2 AND course_id = $3`,
      [percentage, userId, courseId],
    );

    if (percentage === 100) {
      try {
        await autoIssue(userId, courseId);
      } catch (err) {
        console.error("Certificate auto-issuance failed:", err);
      }
    }
  }

  return result.rows[0];
};

export const markLessonIncomplete = async (
  userId: number,
  lessonId: number,
) => {
  const lessonResult = await query(
    `SELECT m.course_id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = $1`,
    [lessonId],
  );
  if (lessonResult.rows.length === 0) throw new Error("Lesson not found");
  const courseId = Number(lessonResult.rows[0].course_id);
  const enrollment = await query(
    "SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2",
    [userId, courseId],
  );
  if (enrollment.rows.length === 0) throw new Error("Enrollment not found");
  const result = await query(
    "UPDATE progress SET completed = false, completed_at = NULL WHERE user_id = $1 AND lesson_id = $2 RETURNING *",
    [userId, lessonId],
  );
  const { percentage } = await getCourseProgress(userId, courseId);
  await query(
    "UPDATE enrollments SET progress = $1, completed_at = NULL WHERE user_id = $2 AND course_id = $3",
    [percentage, userId, courseId],
  );
  return result.rows[0];
};

export const getUserProgress = async (userId: number, courseId: number) => {
  const result = await query(
    `SELECT p.*, l.title as lesson_title, l.module_id
     FROM progress p
     JOIN lessons l ON p.lesson_id = l.id
     JOIN modules m ON l.module_id = m.id
     WHERE p.user_id = $1 AND m.course_id = $2`,
    [userId, courseId],
  );
  return result.rows;
};

export const getCourseProgress = async (userId: number, courseId: number) => {
  const totalResult = await query(
    "SELECT COUNT(*) as total FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = $1",
    [courseId],
  );

  const completedResult = await query(
    `SELECT COUNT(*) as completed
     FROM progress p
     JOIN lessons l ON p.lesson_id = l.id
     JOIN modules m ON l.module_id = m.id
     WHERE p.user_id = $1 AND m.course_id = $2 AND p.completed = true`,
    [userId, courseId],
  );

  const total = parseInt(totalResult.rows[0].total);
  const completed = parseInt(completedResult.rows[0].completed);
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, percentage };
};

export const getLessonProgress = async (userId: number, lessonId: number) => {
  const result = await query(
    "SELECT * FROM progress WHERE user_id = $1 AND lesson_id = $2",
    [userId, lessonId],
  );
  return result.rows[0];
};
