import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { pool } from '../config/db';

const router = Router();

// GET /api/discussions/course/:courseId - Get discussions for a course
router.get('/course/:courseId', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM discussions WHERE course_id = $1 ORDER BY created_at DESC',
      [parseInt(req.params.courseId)]
    );
    
    const allDiscussions = result.rows.map(row => ({
      id: String(row.id),
      courseId: String(row.course_id),
      lessonIndex: row.lesson_index,
      userId: String(row.user_id),
      userName: row.user_name,
      userRole: row.user_role,
      content: row.content,
      parentId: row.parent_id ? String(row.parent_id) : null,
      createdAt: row.created_at,
    }));
    
    // Build tree structure: top-level discussions with nested replies
    const topLevel = allDiscussions.filter((d) => !d.parentId);
    const discussionsWithReplies = topLevel.map((d) => ({
      ...d,
      replies: allDiscussions.filter((r) => r.parentId === d.id),
    }));
    
    res.json(discussionsWithReplies);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/discussions - Post a comment or reply
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, lessonIndex, content, parentId } = req.body;
    
    // Get user info
    const userResult = await pool.query(
      'SELECT id, name, role FROM users WHERE id = $1',
      [req.user!.id]
    );
    const user = userResult.rows[0];
    
    const result = await pool.query(
      `INSERT INTO discussions (course_id, lesson_index, user_id, user_name, user_role, content, parent_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        parseInt(courseId),
        lessonIndex || 0,
        req.user!.id,
        user.name,
        user.role,
        content,
        parentId ? parseInt(parentId) : null,
      ]
    );
    
    const row = result.rows[0];
    res.status(201).json({
      id: String(row.id),
      courseId: String(row.course_id),
      lessonIndex: row.lesson_index,
      userId: String(row.user_id),
      userName: row.user_name,
      userRole: row.user_role,
      content: row.content,
      parentId: row.parent_id ? String(row.parent_id) : null,
      createdAt: row.created_at,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/discussions/:id/replies - Reply to a discussion
router.post('/:id/replies', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    const parentId = parseInt(req.params.id);
    
    // Get parent discussion info
    const parentResult = await pool.query(
      'SELECT course_id, lesson_index FROM discussions WHERE id = $1',
      [parentId]
    );
    
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Discussion not found' });
    }
    
    const parent = parentResult.rows[0];
    
    // Get user info
    const userResult = await pool.query(
      'SELECT id, name, role FROM users WHERE id = $1',
      [req.user!.id]
    );
    const user = userResult.rows[0];
    
    const result = await pool.query(
      `INSERT INTO discussions (course_id, lesson_index, user_id, user_name, user_role, content, parent_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        parent.course_id,
        parent.lesson_index,
        req.user!.id,
        user.name,
        user.role,
        content,
        parentId,
      ]
    );
    
    const row = result.rows[0];
    res.status(201).json({
      id: String(row.id),
      courseId: String(row.course_id),
      lessonIndex: row.lesson_index,
      userId: String(row.user_id),
      userName: row.user_name,
      userRole: row.user_role,
      content: row.content,
      parentId: String(row.parent_id),
      createdAt: row.created_at,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
