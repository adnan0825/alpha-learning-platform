import { query } from '../config/db';

export const createModule = async (courseId: number, data: { title: string; description?: string; position?: number }) => {
  const result = await query(
    'INSERT INTO modules (course_id, title, description, position) VALUES ($1, $2, $3, $4) RETURNING *',
    [courseId, data.title, data.description, data.position || 0]
  );
  return result.rows[0];
};

export const getModules = async (courseId: number) => {
  const result = await query(
    'SELECT * FROM modules WHERE course_id = $1 ORDER BY position',
    [courseId]
  );
  return result.rows;
};

export const updateModule = async (id: number, data: { title?: string; description?: string; position?: number }) => {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.title) { fields.push(`title = $${paramIndex++}`); values.push(data.title); }
  if (data.description) { fields.push(`description = $${paramIndex++}`); values.push(data.description); }
  if (data.position !== undefined) { fields.push(`position = $${paramIndex++}`); values.push(data.position); }

  if (fields.length === 0) return null;
  values.push(id);

  const result = await query(`UPDATE modules SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
  return result.rows[0];
};

export const deleteModule = async (id: number) => {
  await query('DELETE FROM modules WHERE id = $1', [id]);
};

export const createLesson = async (moduleId: number, data: {
  title: string;
  content?: string;
  video_url?: string;
  duration?: number;
  position?: number;
  is_free?: boolean;
}) => {
  const result = await query(
    `INSERT INTO lessons (module_id, title, content, video_url, duration, position, is_free)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [moduleId, data.title, data.content, data.video_url, data.duration, data.position || 0, data.is_free || false]
  );
  return result.rows[0];
};

export const getLessonById = async (id: number) => {
  const result = await query(
    `SELECT l.*, m.course_id FROM lessons l JOIN modules m ON l.module_id = m.id WHERE l.id = $1`,
    [id]
  );
  return result.rows[0];
};

export const getLessonsByModule = async (moduleId: number) => {
  const result = await query(
    'SELECT * FROM lessons WHERE module_id = $1 ORDER BY position',
    [moduleId]
  );
  return result.rows;
};

export const updateLesson = async (id: number, data: Partial<{
  title: string;
  content: string;
  video_url: string;
  duration: number;
  position: number;
  is_free: boolean;
}>) => {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  });

  if (fields.length === 0) return null;
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const result = await query(`UPDATE lessons SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
  return result.rows[0];
};

export const deleteLesson = async (id: number) => {
  await query('DELETE FROM lessons WHERE id = $1', [id]);
};
