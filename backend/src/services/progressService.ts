import { query } from '../config/db';
import { autoIssue } from './certificateService';

export const markLessonComplete = async (userId: number, lessonId: number) => {
  const result = await query(
    `INSERT INTO progress (user_id, lesson_id, completed, completed_at)
     VALUES ($1, $2, true, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, lesson_id) DO UPDATE SET completed = true, completed_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, lessonId]
  );

  // Derive courseId from the lesson record (lessons → modules → course_id)
  const lessonResult = await query(
    'SELECT m.course_id FROM lessons l JOIN modules m ON l.module_id = m.id WHERE l.id = $1',
    [lessonId]
  );

  if (lessonResult.rows.length > 0) {
    const courseId: number = lessonResult.rows[0].course_id;
    const { percentage } = await getCourseProgress(userId, courseId);

    if (percentage === 100) {
      try {
        await autoIssue(userId, courseId);
      } catch (err) {
        console.error('Certificate auto-issuance failed:', err);
      }
    }
  }

  return result.rows[0];
};

export const markLessonIncomplete = async (userId: number, lessonId: number) => {
  const result = await query(
    'UPDATE progress SET completed = false, completed_at = NULL WHERE user_id = $1 AND lesson_id = $2 RETURNING *',
    [userId, lessonId]
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
    [userId, courseId]
  );
  return result.rows;
};

export const getCourseProgress = async (userId: number, courseId: number) => {
  const totalResult = await query(
    'SELECT COUNT(*) as total FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = $1',
    [courseId]
  );
  
  const completedResult = await query(
    `SELECT COUNT(*) as completed
     FROM progress p
     JOIN lessons l ON p.lesson_id = l.id
     JOIN modules m ON l.module_id = m.id
     WHERE p.user_id = $1 AND m.course_id = $2 AND p.completed = true`,
    [userId, courseId]
  );

  const total = parseInt(totalResult.rows[0].total);
  const completed = parseInt(completedResult.rows[0].completed);
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, percentage };
};

export const getLessonProgress = async (userId: number, lessonId: number) => {
  const result = await query(
    'SELECT * FROM progress WHERE user_id = $1 AND lesson_id = $2',
    [userId, lessonId]
  );
  return result.rows[0];
};
