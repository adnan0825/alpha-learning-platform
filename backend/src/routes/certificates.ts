import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { pool } from '../config/db';
import { getByNumber } from '../services/certificateService';

const router = Router();

// GET /api/certificates/verify/:certificateNumber - Public verification endpoint (no auth)
router.get('/verify/:certificateNumber', async (req: Request, res: Response) => {
  try {
    const certificate = await getByNumber(req.params.certificateNumber);
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    res.json(certificate);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/certificates/student/:id - Get student's certificates
router.get('/student/:studentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.student_id, c.course_id, c.issued_at, c.certificate_number,
              c.instructor_name, c.student_name, c.verification_url,
              crs.title as course_title, crs.thumbnail as course_thumbnail
       FROM certificates c
       JOIN courses crs ON c.course_id = crs.id
       WHERE c.student_id = $1
       ORDER BY c.issued_at DESC`,
      [parseInt(req.params.studentId)]
    );

    const certificates = result.rows.map(row => ({
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: row.student_name,
      courseId: String(row.course_id),
      courseTitle: row.course_title,
      courseThumbnail: row.course_thumbnail,
      instructorName: row.instructor_name ?? '',
      verificationUrl: row.verification_url ?? '',
      issuedAt: row.issued_at,
      certificateNumber: row.certificate_number,
    }));

    res.json(certificates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/certificates - Issue a certificate
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, courseId, instructorName, studentName, verificationUrl } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({ error: 'Student ID and course ID are required' });
    }

    // Check if student completed the course (100% progress)
    const enrollmentResult = await pool.query(
      'SELECT * FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [parseInt(studentId), parseInt(courseId)]
    );

    if (enrollmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const enrollment = enrollmentResult.rows[0];

    // Check if already has certificate
    const existingCert = await pool.query(
      'SELECT * FROM certificates WHERE student_id = $1 AND course_id = $2',
      [parseInt(studentId), parseInt(courseId)]
    );

    if (existingCert.rows.length > 0) {
      return res.status(400).json({ error: 'Certificate already issued' });
    }

    // Generate certificate number
    const year = new Date().getFullYear();
    const countResult = await pool.query('SELECT COUNT(*) as count FROM certificates');
    const count = parseInt(countResult.rows[0].count) + 1;
    const certificateNumber = `SOTA-${year}-${String(count).padStart(5, '0')}`;

    // Insert certificate
    const result = await pool.query(
      `INSERT INTO certificates (student_id, course_id, certificate_number, issued_at, instructor_name, student_name, verification_url)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6)
       RETURNING *`,
      [parseInt(studentId), parseInt(courseId), certificateNumber, instructorName ?? null, studentName ?? null, verificationUrl ?? null]
    );

    const row = result.rows[0];
    res.status(201).json({
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: row.student_name,
      courseId: String(row.course_id),
      certificateNumber: row.certificate_number,
      instructorName: row.instructor_name ?? '',
      verificationUrl: row.verification_url ?? '',
      issuedAt: row.issued_at,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
