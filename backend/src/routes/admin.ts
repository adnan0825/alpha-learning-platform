import { Router, Response } from 'express';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import { query, pool } from '../config/db';
import * as feedbackService from '../services/feedbackService';

const router = Router();

// ============================================
// PLATFORM SETTINGS
// ============================================

// GET /api/admin/settings - Get all settings (admin only)
router.get('/settings', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get platform statistics
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'instructor') as total_instructors,
        (SELECT COUNT(*) FROM courses) as total_courses,
        (SELECT COUNT(*) FROM courses WHERE is_published = true) as published_courses,
        (SELECT COUNT(*) FROM enrollments) as total_enrollments,
        (SELECT COUNT(*) FROM payments WHERE status = 'completed') as completed_payments,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') as total_revenue
    `);

    const settingsResult = await query(
      'SELECT key, value FROM settings WHERE key IN ($1, $2, $3)',
      ['appearance', 'features', 'faq']
    );

    const settingsMap: Record<string, unknown> = {};
    settingsResult.rows.forEach((row: { key: string; value: unknown }) => {
      settingsMap[row.key] = row.value;
    });

    const defaultAppearance = {
      primaryColor: "#fbbf24",
      logo: "",
      fontFamily: "Inter",
      heroIntroVideoUrl: "",
    };

    res.json({
      platform: stats.rows[0],
      appearance: { ...defaultAppearance, ...(settingsMap.appearance as object || {}) },
      features: settingsMap.features || {
        payments_enabled: true,
        certificates_enabled: true,
        quizzes_enabled: true,
        discussions_enabled: true,
        max_file_size: 5 * 1024 * 1024, // 5MB
        allowed_file_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      },
      faq: Array.isArray(settingsMap.faq) ? settingsMap.faq : [],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/settings - Update settings (admin only)
router.put('/settings', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { appearance, features, faq } = req.body;

    if (appearance) {
      await query(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
      `, ['appearance', appearance]);
    }

    if (features) {
      await query(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
      `, ['features', features]);
    }

    if (faq !== undefined) {
      await query(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
      `, ['faq', faq]);
    }

    res.json({
      message: 'Settings updated successfully',
      appearance,
      features,
      faq,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SYSTEM LOGS
// ============================================

// GET /api/admin/logs - Get system logs (admin only)
router.get('/logs', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 100, type = 'all' } = req.query;
    
    // Query recent activities from various tables
    const logs = await query(`
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
    `, [parseInt(limit as string)]);
    
    res.json(logs.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// REPORTS
// ============================================

// GET /api/admin/reports/overview - Platform overview report
router.get('/reports/overview', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { period = '30' } = req.query; // days
    const days = parseInt(period as string);
    
    // Get various metrics
    const [userGrowth, courseStats, revenueStats, activityStats] = await Promise.all([
      query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          role
        FROM users
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at), role
        ORDER BY date ASC
      `, []),
      query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_published = true) as published,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '${days} days') as new_courses,
          AVG(extract(epoch from duration)::integer) as avg_duration
        FROM courses
      `, []),
      query(`
        SELECT 
          COUNT(*) as total_payments,
          COALESCE(SUM(amount), 0) as total_revenue,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as completed_revenue
        FROM payments
        WHERE created_at >= NOW() - INTERVAL '${days} days'
      `, []),
      query(`
        SELECT 
          COUNT(*) as total_enrollments,
          COUNT(DISTINCT user_id) as active_students,
          COUNT(DISTINCT course_id) as active_courses
        FROM enrollments
        WHERE enrolled_at >= NOW() - INTERVAL '${days} days'
      `, [])
    ]);
    
    res.json({
      period: `${days} days`,
      userGrowth: userGrowth.rows,
      courseStats: courseStats.rows[0],
      revenueStats: revenueStats.rows[0],
      activityStats: activityStats.rows[0]
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/reports/users - User activity report
router.get('/reports/users', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
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
});

// GET /api/admin/reports/courses - Course performance report
router.get('/reports/courses', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
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
});

// ============================================
// CONTENT MODERATION
// ============================================

// GET /api/admin/moderation/discussions - Get all discussions for moderation
router.get('/moderation/discussions', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50, course } = req.query;
    const courseFilter = course ? `AND d.course_id = ${parseInt(course as string)}` : '';
    
    const discussions = await query(`
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
    `, [parseInt(limit as string)]);
    
    res.json(discussions.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/moderation/discussions/:id - Delete discussion
router.delete('/moderation/discussions/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const discussionId = parseInt(req.params.id, 10);
    if (!Number.isFinite(discussionId)) {
      return res.status(400).json({ error: 'Invalid discussion id' });
    }
    const result = await query('DELETE FROM discussions WHERE id = $1 RETURNING id', [discussionId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Discussion not found' });
    }
    res.json({ success: true, message: 'Discussion deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/moderation/reviews - Get all reviews for moderation
router.get('/moderation/reviews', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
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
});

// DELETE /api/admin/moderation/reviews/:id - Delete review
router.delete('/moderation/reviews/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const reviewId = parseInt(req.params.id);
    await query('DELETE FROM reviews WHERE id = $1', [reviewId]);
    res.json({ success: true, message: 'Review deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// USER FEEDBACK / QUESTIONS
// ============================================

router.get('/feedback', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await feedbackService.listFeedbackForAdmin();
    res.json(
      rows.map((r: any) => ({
        id: String(r.id),
        userId: String(r.user_id),
        userName: r.user_name,
        userEmail: r.user_email,
        subject: r.subject,
        message: r.message,
        adminReply: r.admin_reply,
        repliedAt: r.replied_at,
        createdAt: r.created_at,
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/feedback/:id/reply', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { reply } = req.body;
    if (!reply || typeof reply !== 'string') {
      return res.status(400).json({ error: 'Reply is required' });
    }
    const row = await feedbackService.replyToFeedback(id, reply);
    res.json({
      id: String(row.id),
      userId: String(row.user_id),
      subject: row.subject,
      message: row.message,
      adminReply: row.admin_reply,
      repliedAt: row.replied_at,
      createdAt: row.created_at,
    });
  } catch (error: any) {
    res.status(error.message === 'Feedback not found' ? 404 : 400).json({ error: error.message });
  }
});

router.delete('/feedback/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    await feedbackService.deleteFeedback(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(error.message === 'Feedback not found' ? 404 : 500).json({ error: error.message });
  }
});

// ============================================
// PAYMENTS MANAGEMENT
// ============================================

// GET /api/admin/payments - Get all payments
router.get('/payments', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, limit = 100 } = req.query;
    const statusFilter = status ? `AND p.status = '${status}'` : '';
    
    const payments = await query(`
      SELECT 
        p.*,
        u.name as user_name,
        u.email as user_email,
        c.title as course_title
      FROM payments p
      JOIN users u ON p.user_id = u.id
      JOIN courses c ON p.course_id = c.id
      WHERE 1=1 ${statusFilter}
      ORDER BY p.created_at DESC
      LIMIT $1
    `, [parseInt(limit as string)]);
    
    res.json(payments.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/payments/stats - Payment statistics
router.get('/payments/stats', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as completed_amount,
        COALESCE(AVG(amount) FILTER (WHERE status = 'completed'), 0) as average_amount
      FROM payments
    `);
    
    res.json(stats.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/manual-receipts — proof images from manual transfers
router.get('/manual-receipts', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '200'), 10) || 200, 500);
    const rows = await query(
      `
      SELECT
        r.id,
        r.receipt_image_url,
        r.amount_etb,
        r.note,
        r.created_at,
        r.status,
        r.reviewed_at,
        ru.name AS reviewed_by_name,
        u.name AS user_name,
        u.email AS user_email,
        c.title AS course_title,
        c.id AS course_id
      FROM manual_payment_receipts r
      JOIN users u ON r.user_id = u.id
      JOIN courses c ON r.course_id = c.id
      LEFT JOIN users ru ON r.reviewed_by = ru.id
      ORDER BY r.created_at DESC
      LIMIT $1
    `,
      [limit]
    );
    res.json(rows.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** Approve: enroll student + mark receipt approved */
async function approveManualReceiptById(res: Response, rid: number, adminId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const upd = await client.query(
      `UPDATE manual_payment_receipts
       SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2
       WHERE id = $1 AND COALESCE(status, 'pending') = 'pending'
       RETURNING user_id, course_id`,
      [rid, adminId]
    );
    if (upd.rows.length === 0) {
      await client.query('ROLLBACK');
      const chk = await pool.query('SELECT id, status FROM manual_payment_receipts WHERE id = $1', [rid]);
      if (chk.rows.length === 0) {
        res.status(400).json({ error: 'Receipt not found' });
        return;
      }
      res.status(400).json({
        error: 'Already processed',
        status: chk.rows[0].status || 'pending',
      });
      return;
    }
    const { user_id, course_id } = upd.rows[0];
    await client.query(
      `INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)
       ON CONFLICT (user_id, course_id) DO NOTHING`,
      [user_id, course_id]
    );
    await client.query('COMMIT');
    res.json({ success: true, enrolled: true, user_id, course_id });
  } catch (error: any) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    console.error('Approve manual receipt:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Failed to approve' });
    }
  } finally {
    client.release();
  }
}

/** Literal path first — avoids 404s when proxies mishandle `/manual-receipts/:id/approve` */
router.post('/manual-receipts/approve', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const rid = parseInt(String(req.body?.receiptId ?? ''), 10);
  if (!Number.isFinite(rid)) {
    return res.status(400).json({ error: 'receiptId is required' });
  }
  await approveManualReceiptById(res, rid, req.user!.id);
});

router.post('/manual-receipts/:id/approve', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const rid = parseInt(req.params.id, 10);
  if (!Number.isFinite(rid)) {
    return res.status(400).json({ error: 'Invalid receipt id' });
  }
  await approveManualReceiptById(res, rid, req.user!.id);
});

async function removeManualReceiptById(res: Response, rid: number): Promise<void> {
  try {
    const del = await query('DELETE FROM manual_payment_receipts WHERE id = $1 RETURNING id', [rid]);
    const removed = Array.isArray(del.rows) && del.rows.length > 0;
    res.json({ success: true, removed });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

router.post('/manual-receipts/remove', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const rid = parseInt(String(req.body?.receiptId ?? ''), 10);
  if (!Number.isFinite(rid)) {
    return res.status(400).json({ error: 'receiptId is required' });
  }
  await removeManualReceiptById(res, rid);
});

async function removeManualReceiptHandler(req: AuthRequest, res: Response) {
  const rid = parseInt(req.params.id, 10);
  if (!Number.isFinite(rid)) {
    return res.status(400).json({ error: 'Invalid receipt id' });
  }
  await removeManualReceiptById(res, rid);
}

router.delete('/manual-receipts/:id', authenticate, requireAdmin, removeManualReceiptHandler);
router.post('/manual-receipts/:id/remove', authenticate, requireAdmin, removeManualReceiptHandler);

export default router;
