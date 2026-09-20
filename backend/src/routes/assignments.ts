import { Router, Response } from "express";
import { authenticate, AuthRequest, authorize } from "../middleware/auth";
import { query } from "../config/db";
import {
  createNotification,
  notifyEnrolledStudents,
} from "../services/analyticsService";

const router = Router();

function toAssignment(row: any) {
  return {
    id: String(row.id),
    courseId: String(row.course_id),
    courseTitle: row.course_title || undefined,
    title: row.title,
    description: row.description || "",
    dueDate: row.due_date,
    points: Number(row.points),
  };
}

function toSubmission(row: any) {
  return {
    id: String(row.id),
    assignmentId: String(row.assignment_id),
    studentId: String(row.student_id),
    studentName: row.student_name || "Student",
    submittedAt: row.submitted_at,
    points:
      row.assignment_points === null || row.assignment_points === undefined
        ? undefined
        : Number(row.assignment_points),
    fileUrl: row.file_url || undefined,
    content: row.content || "",
    grade: row.grade === null ? undefined : Number(row.grade),
    feedback: row.feedback || undefined,
    status: row.grade === null ? "pending" : "graded",
  };
}

async function canAccessCourse(
  user: NonNullable<AuthRequest["user"]>,
  courseId: number,
) {
  if (user.role === "admin") return true;
  if (user.role === "instructor") {
    const result = await query(
      "SELECT 1 FROM courses WHERE id = $1 AND instructor_id = $2",
      [courseId, user.id],
    );
    return (result.rowCount ?? 0) > 0;
  }
  const result = await query(
    "SELECT 1 FROM enrollments WHERE course_id = $1 AND user_id = $2",
    [courseId, user.id],
  );
  return (result.rowCount ?? 0) > 0;
}

router.get(
  "/courses/:courseId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const courseId = Number.parseInt(req.params.courseId, 10);
      if (!Number.isFinite(courseId)) {
        return res.status(400).json({ error: "Invalid course id" });
      }
      if (!(await canAccessCourse(req.user!, courseId))) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const result = await query(
        `SELECT a.*, c.title AS course_title
         FROM assignments a
         JOIN courses c ON c.id = a.course_id
         WHERE a.course_id = $1
         ORDER BY a.due_date ASC, a.created_at DESC`,
        [courseId],
      );
      res.json(result.rows.map(toAssignment));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/courses/:courseId",
  authenticate,
  authorize("instructor", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const courseId = Number.parseInt(req.params.courseId, 10);
      const title =
        typeof req.body.title === "string" ? req.body.title.trim() : "";
      const description =
        typeof req.body.description === "string"
          ? req.body.description.trim()
          : "";
      const dueDate = new Date(String(req.body.dueDate || ""));
      const points = Number(String(req.body.points ?? "").trim());
      if (
        !Number.isFinite(courseId) ||
        !title ||
        !Number.isFinite(dueDate.getTime()) ||
        !Number.isInteger(points) ||
        points < 1
      ) {
        return res
          .status(400)
          .json({ error: "Title, due date, and valid points are required" });
      }
      if (!(await canAccessCourse(req.user!, courseId))) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const result = await query(
        `INSERT INTO assignments (course_id, created_by, title, description, due_date, points)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          courseId,
          req.user!.id,
          title.slice(0, 255),
          description,
          dueDate.toISOString(),
          points,
        ],
      );
      await notifyEnrolledStudents(
        courseId,
        "New assignment",
        `${title} is now available in your course.`,
        "assignment",
        "/student/assignments",
      );
      res.status(201).json(toAssignment(result.rows[0]));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  "/student/submissions",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const result = await query(
        `SELECT s.*, u.name AS student_name, a.points AS assignment_points
         FROM assignment_submissions s
         JOIN assignments a ON a.id = s.assignment_id
         JOIN users u ON u.id = s.student_id
         WHERE s.student_id = $1
         ORDER BY s.submitted_at DESC`,
        [req.user!.id],
      );
      res.json(result.rows.map(toSubmission));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/:assignmentId/submissions",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const assignmentId = Number.parseInt(req.params.assignmentId, 10);
      const content =
        typeof req.body.content === "string" ? req.body.content.trim() : "";
      const fileUrl =
        typeof req.body.fileUrl === "string" ? req.body.fileUrl.trim() : null;
      if (!Number.isFinite(assignmentId) || (!content && !fileUrl)) {
        return res
          .status(400)
          .json({ error: "A submission note or file link is required" });
      }
      const assignment = await query(
        `SELECT a.id, a.course_id, a.title, c.instructor_id
         FROM assignments a
         JOIN courses c ON c.id = a.course_id
         JOIN enrollments e ON e.course_id = a.course_id AND e.user_id = $2
         WHERE a.id = $1`,
        [assignmentId, req.user!.id],
      );
      if (assignment.rows.length === 0) {
        return res
          .status(403)
          .json({ error: "You are not enrolled in this course" });
      }
      const result = await query(
        `INSERT INTO assignment_submissions (assignment_id, student_id, content, file_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (assignment_id, student_id) DO UPDATE
           SET content = EXCLUDED.content, file_url = EXCLUDED.file_url, submitted_at = CURRENT_TIMESTAMP,
               grade = NULL, feedback = NULL, graded_at = NULL
         RETURNING *`,
        [assignmentId, req.user!.id, content, fileUrl],
      );
      const assignmentRecord = assignment.rows[0];
      const student = await query("SELECT name FROM users WHERE id = $1", [
        req.user!.id,
      ]);
      const studentName = student.rows[0]?.name || "A student";
      await Promise.all([
        createNotification(
          Number(assignmentRecord.instructor_id),
          "New assignment submission",
          `${studentName} submitted ${assignmentRecord.title}.`,
          "assignment",
          "/instructor/assignments",
        ),
        createNotification(
          req.user!.id,
          "Assignment submitted",
          `Your submission for ${assignmentRecord.title} was sent successfully.`,
          "assignment",
          "/student/assignments",
        ),
      ]);
      const submission = await query(
        `SELECT s.*, u.name AS student_name, a.points AS assignment_points
         FROM assignment_submissions s
         JOIN assignments a ON a.id = s.assignment_id
         JOIN users u ON u.id = s.student_id
         WHERE s.id = $1`,
        [result.rows[0].id],
      );
      res.status(201).json(toSubmission(submission.rows[0]));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  "/courses/:courseId/submissions",
  authenticate,
  authorize("instructor", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const courseId = Number.parseInt(req.params.courseId, 10);
      if (
        !Number.isFinite(courseId) ||
        !(await canAccessCourse(req.user!, courseId))
      ) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const result = await query(
        `SELECT s.*, u.name AS student_name, a.points AS assignment_points
         FROM assignment_submissions s
         JOIN assignments a ON a.id = s.assignment_id
         JOIN users u ON u.id = s.student_id
         WHERE a.course_id = $1
         ORDER BY s.submitted_at DESC`,
        [courseId],
      );
      res.json(result.rows.map(toSubmission));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.patch(
  "/submissions/:id/grade",
  authenticate,
  authorize("instructor", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const submissionId = Number.parseInt(req.params.id, 10);
      const grade = Number(String(req.body.grade ?? "").trim());
      const feedback =
        typeof req.body.feedback === "string" ? req.body.feedback.trim() : null;
      if (
        !Number.isFinite(submissionId) ||
        !Number.isInteger(grade) ||
        grade < 0
      ) {
        return res
          .status(400)
          .json({ error: "Grade must be a non-negative whole number" });
      }
      const gradingTarget = await query(
        `SELECT s.assignment_id, s.student_id, a.title, a.points
         FROM assignment_submissions s
         JOIN assignments a ON a.id = s.assignment_id
         JOIN courses c ON c.id = a.course_id
         WHERE s.id = $1
           AND ($2 = 'admin' OR c.instructor_id = $3)`,
        [submissionId, req.user!.role, req.user!.id],
      );
      if (gradingTarget.rows.length === 0) {
        return res.status(404).json({ error: "Submission not found" });
      }
      const target = gradingTarget.rows[0];
      if (grade > Number(target.points)) {
        return res.status(400).json({
          error: `Grade must be between 0 and ${target.points}`,
        });
      }
      const result = await query(
        `UPDATE assignment_submissions s
         SET grade = $1, feedback = $2, graded_at = CURRENT_TIMESTAMP
         FROM assignments a, courses c
         WHERE s.id = $3 AND s.assignment_id = a.id AND a.course_id = c.id
           AND ($4 = 'admin' OR c.instructor_id = $5)
         RETURNING s.*`,
        [grade, feedback, submissionId, req.user!.role, req.user!.id],
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Submission not found" });
      }
      await createNotification(
        Number(target.student_id),
        "Assignment graded",
        `Your submission for ${target.title} received ${grade}/${target.points}.`,
        "assignment",
        "/student/assignments",
      );
      const submission = await query(
        `SELECT s.*, u.name AS student_name, a.points AS assignment_points
         FROM assignment_submissions s
         JOIN assignments a ON a.id = s.assignment_id
         JOIN users u ON u.id = s.student_id
         WHERE s.id = $1`,
        [submissionId],
      );
      res.json(toSubmission(submission.rows[0]));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
