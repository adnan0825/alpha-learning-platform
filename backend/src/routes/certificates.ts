import { Router, Request, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { pool } from "../config/db";
import { autoIssue, getByNumber } from "../services/certificateService";

const router = Router();

// GET /api/certificates/verify/:certificateNumber - Public verification endpoint (no auth)
router.get(
  "/verify/:certificateNumber",
  async (req: Request, res: Response) => {
    try {
      const certificate = await getByNumber(req.params.certificateNumber);
      if (!certificate) {
        return res.status(404).json({ error: "Certificate not found" });
      }
      res.json(certificate);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// GET /api/certificates/student/:id - Get student's certificates
router.get(
  "/student/:studentId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const studentId = parseInt(req.params.studentId, 10);
      if (!Number.isFinite(studentId)) {
        return res.status(400).json({ error: "Invalid student ID" });
      }

      if (req.user!.id !== studentId && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const result = await pool.query(
        `SELECT c.id, c.student_id, c.course_id, c.issued_at, c.certificate_number,
              c.instructor_name, c.student_name, c.verification_url,
              crs.title as course_title, crs.thumbnail as course_thumbnail
       FROM certificates c
       JOIN courses crs ON c.course_id = crs.id
       WHERE c.student_id = $1
       ORDER BY c.issued_at DESC`,
        [studentId],
      );

      const certificates = result.rows.map((row) => ({
        id: String(row.id),
        studentId: String(row.student_id),
        studentName: row.student_name,
        courseId: String(row.course_id),
        courseTitle: row.course_title,
        courseThumbnail: row.course_thumbnail,
        instructorName: row.instructor_name ?? "",
        verificationUrl: row.verification_url ?? "",
        issuedAt: row.issued_at,
        certificateNumber: row.certificate_number,
      }));

      res.json(certificates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// POST /api/certificates - Issue a certificate
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, courseId } = req.body;
    const parsedStudentId = Number.parseInt(String(studentId), 10);
    const parsedCourseId = Number.parseInt(String(courseId), 10);

    if (!Number.isFinite(parsedStudentId) || !Number.isFinite(parsedCourseId)) {
      return res
        .status(400)
        .json({ error: "Student ID and course ID are required" });
    }

    const requesterIsPrivileged =
      req.user!.role === "admin" || req.user!.role === "instructor";
    if (!requesterIsPrivileged && req.user!.id !== parsedStudentId) {
      return res
        .status(403)
        .json({ error: "You can only issue your own certificate" });
    }

    const result = await autoIssue(parsedStudentId, parsedCourseId);
    res.status(result.alreadyExisted ? 200 : 201).json(result.certificate);
  } catch (error: any) {
    const status = error.message === "Enrollment not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

export default router;
