import { query } from '../config/db';

/**
 * JSONB + node-pg: JavaScript arrays are serialized as Postgres *array* literals ({a,b}), NOT JSON.
 * For a jsonb column you must bind JSON *text* once and cast: $n::jsonb (see node-pg lib/utils.js prepareValue).
 */
type VideoLinkRow = { title: string; url: string; duration: string };

function toPlainVideoLinksArray(raw: unknown): VideoLinkRow[] {
  let arr: unknown[] = [];
  if (raw === undefined || raw === null) {
    arr = [];
  } else if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) arr = [];
    else {
      try {
        const p = JSON.parse(t);
        arr = Array.isArray(p) ? p : [];
      } catch {
        throw new Error('video_links must be valid JSON array text');
      }
    }
  } else if (Array.isArray(raw)) {
    arr = raw;
  } else {
    arr = [];
  }

  return arr.map((item) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      return { title: '', url: '', duration: '' };
    }
    const o = item as Record<string, unknown>;
    return {
      title: String(o.title ?? ''),
      url: String(o.url ?? ''),
      duration: o.duration != null ? String(o.duration) : '',
    };
  });
}

// Helper to transform course data to match frontend expectations
const transformCourse = (row: any) => {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description || '',
    category: row.category || '',
    thumbnail: row.thumbnail || '',
    introVideoUrl: row.intro_video_url || '',
    introVideoTitle: row.intro_video_title || '',
    videoLinks: row.video_links || [],
    totalVideos: row.total_videos || 0,
    instructorId: String(row.instructor_id),
    instructorName: row.instructor_name || row.instructor_name,
    enrolledCount: row.enrolled_count || 0,
    status: row.is_published ? 'published' : 'draft',
    difficulty: row.difficulty || 'beginner',
    duration: row.duration || '',
    price: row.price || 0,
    createdAt: row.created_at,
  };
};

export const createCourse = async (data: {
  title: string;
  description?: string;
  thumbnail?: string;
  introVideoUrl?: string;
  introVideoTitle?: string;
  instructor_id: number;
  category?: string;
  difficulty?: string;
  price?: number;
  videoLinks?: any[];
  totalVideos?: number;
  duration?: string;
}) => {
  const linksJson = JSON.stringify(toPlainVideoLinksArray(data.videoLinks));
  const result = await query(
    `INSERT INTO courses (title, description, thumbnail, intro_video_url, intro_video_title, instructor_id, category, difficulty, price, video_links, total_videos, duration, is_published)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, true) RETURNING *`,
    [
      data.title,
      data.description,
      data.thumbnail,
      data.introVideoUrl || null,
      data.introVideoTitle || null,
      data.instructor_id,
      data.category,
      data.difficulty,
      data.price || 0,
      linksJson,
      data.totalVideos || 0,
      data.duration || '',
    ]
  );
  const row = result.rows[0];
  // Get instructor name
  const instructorResult = await query('SELECT name FROM users WHERE id = $1', [data.instructor_id]);
  row.instructor_name = instructorResult.rows[0]?.name;
  return transformCourse(row);
};

export const getCourses = async (filters?: { category?: string; difficulty?: string; instructor_id?: number; is_published?: boolean }) => {
  let sql = 'SELECT c.*, u.name as instructor_name FROM courses c JOIN users u ON c.instructor_id = u.id WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.category) {
    sql += ` AND c.category = $${paramIndex++}`;
    params.push(filters.category);
  }
  if (filters?.difficulty) {
    sql += ` AND c.difficulty = $${paramIndex++}`;
    params.push(filters.difficulty);
  }
  if (filters?.instructor_id) {
    sql += ` AND c.instructor_id = $${paramIndex++}`;
    params.push(filters.instructor_id);
  }
  if (filters?.is_published !== undefined) {
    sql += ` AND c.is_published = $${paramIndex++}`;
    params.push(filters.is_published);
  }

  sql += ' ORDER BY c.created_at DESC';
  const result = await query(sql, params);
  return result.rows.map(transformCourse);
};

export const getCourseById = async (id: number) => {
  const result = await query(
    `SELECT c.*, u.name as instructor_name, u.avatar as instructor_avatar
     FROM courses c JOIN users u ON c.instructor_id = u.id WHERE c.id = $1`,
    [id]
  );
  const row = result.rows[0];
  if (!row) return null;
  return transformCourse(row);
};

export const updateCourse = async (id: number, data: Partial<{
  title: string;
  description: string;
  thumbnail: string;
  introVideoUrl: string;
  introVideoTitle: string;
  intro_video_url: string;
  intro_video_title: string;
  category: string;
  difficulty: string;
  price: number;
  is_published: boolean;
  status: string;
  videoLinks: any[];
  video_links: any[];
  totalVideos: number;
  total_videos: number;
  duration: string;
}>) => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let p = 1;

  const push = (column: string, value: unknown) => {
    fields.push(`${column} = $${p++}`);
    values.push(value);
  };

  const pushVideoLinksJsonb = (arr: VideoLinkRow[]) => {
    fields.push(`video_links = $${p++}::jsonb`);
    values.push(JSON.stringify(arr));
  };

  /** Prefer snake_case from API client; avoid wrong branch when both keys exist. */
  const videoLinks = data.video_links ?? data.videoLinks;
  const totalVideos = data.totalVideos ?? data.total_videos;
  const introUrl = data.introVideoUrl ?? data.intro_video_url;
  const introTitle = data.introVideoTitle ?? data.intro_video_title;

  if (data.status !== undefined) {
    push('is_published', data.status === 'published');
  }
  if (videoLinks !== undefined) {
    pushVideoLinksJsonb(toPlainVideoLinksArray(videoLinks));
  }
  if (totalVideos !== undefined) {
    push('total_videos', totalVideos);
  }
  if (data.duration !== undefined) {
    push('duration', data.duration);
  }
  if (introUrl !== undefined) {
    push('intro_video_url', introUrl?.trim() ? introUrl.trim() : null);
  }
  if (introTitle !== undefined) {
    push('intro_video_title', introTitle?.trim() ? introTitle.trim() : null);
  }
  if (data.title !== undefined) push('title', data.title);
  if (data.description !== undefined) push('description', data.description);
  if (data.category !== undefined) push('category', data.category);
  if (data.thumbnail !== undefined) push('thumbnail', data.thumbnail);
  if (data.difficulty !== undefined) push('difficulty', data.difficulty);
  if (data.price !== undefined) push('price', data.price);

  if (fields.length === 0) return null;

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const result = await query(
    `UPDATE courses SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`,
    values
  );
  const row = result.rows[0];
  if (!row) return null;

  const instructorResult = await query(
    'SELECT u.name FROM courses c JOIN users u ON c.instructor_id = u.id WHERE c.id = $1',
    [id]
  );
  row.instructor_name = instructorResult.rows[0]?.name;
  return transformCourse(row);
};

export const deleteCourse = async (id: number) => {
  await query('DELETE FROM courses WHERE id = $1', [id]);
};

export const getCourseModules = async (courseId: number) => {
  const result = await query(
    'SELECT * FROM modules WHERE course_id = $1 ORDER BY position',
    [courseId]
  );
  return result.rows;
};
