import { Router, Response } from "express";
import { authenticate, AuthRequest, authorize } from "../middleware/auth";
import { pool } from "../config/db";
import { notifyEnrolledStudents } from "../services/analyticsService";

const router = Router();

// GET /api/quizzes/course/:courseId - Get quizzes for a course
router.get("/course/:courseId", async (req: AuthRequest, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const result = await pool.query(
      includeInactive
        ? "SELECT * FROM quizzes WHERE course_id = $1 ORDER BY created_at DESC"
        : "SELECT * FROM quizzes WHERE course_id = $1 AND is_active = true ORDER BY created_at DESC",
      [parseInt(req.params.courseId)],
    );
    const quizzes = result.rows.map((row) => ({
      id: String(row.id),
      courseId: String(row.course_id),
      title: row.title,
      questions: row.questions || [],
      isActive: row.is_active ?? true,
      createdAt: row.created_at,
    }));
    res.json(quizzes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/quizzes - Create a quiz (instructor/admin)
router.post(
  "/",
  authenticate,
  authorize("instructor", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { courseId, title, questions } = req.body;
      const result = await pool.query(
        "INSERT INTO quizzes (course_id, title, questions) VALUES ($1, $2, $3) RETURNING *",
        [parseInt(courseId), title, JSON.stringify(questions)],
      );
      const row = result.rows[0];
      await notifyEnrolledStudents(
        parseInt(courseId),
        "New quiz",
        `${title} is now available in your course.`,
        "quiz",
        `/course/${courseId}`,
      );
      res.status(201).json({
        id: String(row.id),
        courseId: String(row.course_id),
        title: row.title,
        questions: row.questions,
        isActive: row.is_active ?? true,
        createdAt: row.created_at,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

// PUT /api/quizzes/:id - Update a quiz (instructor/admin owner check)
router.put(
  "/:id",
  authenticate,
  authorize("instructor", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const quizId = parseInt(req.params.id, 10);
      const { title, questions } = req.body;

      const quizCheck = await pool.query(
        "SELECT course_id FROM quizzes WHERE id = $1",
        [quizId],
      );
      if (quizCheck.rows.length === 0) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      if (req.user!.role !== "admin") {
        const courseOwner = await pool.query(
          "SELECT instructor_id FROM courses WHERE id = $1",
          [quizCheck.rows[0].course_id],
        );

        if (
          !courseOwner.rows[0] ||
          Number(courseOwner.rows[0].instructor_id) !== req.user!.id
        ) {
          return res.status(403).json({
            error: "You can only edit your own quizzes",
          });
        }
      }

      const result = await pool.query(
        "UPDATE quizzes SET title = $1, questions = $2 WHERE id = $3 RETURNING *",
        [title, JSON.stringify(questions || []), quizId],
      );

      const row = result.rows[0];
      res.json({
        id: String(row.id),
        courseId: String(row.course_id),
        title: row.title,
        questions: row.questions || [],
        isActive: row.is_active ?? true,
        createdAt: row.created_at,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

// PATCH /api/quizzes/:id/status - Activate or deactivate a quiz without deleting it
router.patch(
  "/:id/status",
  authenticate,
  authorize("instructor", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const quizId = parseInt(req.params.id, 10);
      const isActive = Boolean(req.body.isActive);

      const quizCheck = await pool.query(
        "SELECT course_id FROM quizzes WHERE id = $1",
        [quizId],
      );
      if (quizCheck.rows.length === 0) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      if (req.user!.role !== "admin") {
        const courseOwner = await pool.query(
          "SELECT instructor_id FROM courses WHERE id = $1",
          [quizCheck.rows[0].course_id],
        );

        if (
          !courseOwner.rows[0] ||
          Number(courseOwner.rows[0].instructor_id) !== req.user!.id
        ) {
          return res.status(403).json({
            error: "You can only change the status of your own quizzes",
          });
        }
      }

      const result = await pool.query(
        "UPDATE quizzes SET is_active = $1 WHERE id = $2 RETURNING *",
        [isActive, quizId],
      );

      const row = result.rows[0];
      res.json({
        id: String(row.id),
        courseId: String(row.course_id),
        title: row.title,
        questions: row.questions || [],
        isActive: row.is_active ?? true,
        createdAt: row.created_at,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

// DELETE /api/quizzes/:id - Backward compatibility: deactivate rather than permanently delete
router.delete(
  "/:id",
  authenticate,
  authorize("instructor", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const quizId = parseInt(req.params.id, 10);

      const quizCheck = await pool.query(
        "SELECT course_id FROM quizzes WHERE id = $1",
        [quizId],
      );
      if (quizCheck.rows.length === 0) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      if (req.user!.role !== "admin") {
        const courseOwner = await pool.query(
          "SELECT instructor_id FROM courses WHERE id = $1",
          [quizCheck.rows[0].course_id],
        );

        if (
          !courseOwner.rows[0] ||
          Number(courseOwner.rows[0].instructor_id) !== req.user!.id
        ) {
          return res.status(403).json({
            error: "You can only deactivate your own quizzes",
          });
        }
      }

      const result = await pool.query(
        "UPDATE quizzes SET is_active = false WHERE id = $1 RETURNING *",
        [quizId],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      const row = result.rows[0];
      res.json({
        id: String(row.id),
        courseId: String(row.course_id),
        title: row.title,
        questions: row.questions || [],
        isActive: false,
        createdAt: row.created_at,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

// POST /api/quizzes/:id/submit - Submit quiz answers
router.post(
  "/:id/submit",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { answers } = req.body;
      const quizId = parseInt(req.params.id);

      // Get quiz questions
      const quizResult = await pool.query(
        "SELECT * FROM quizzes WHERE id = $1",
        [quizId],
      );
      if (quizResult.rows.length === 0) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      const quiz = quizResult.rows[0];
      let score = 0;
      const questions = quiz.questions || [];

      questions.forEach((q: any, i: number) => {
        if (answers[i] === q.correctIndex) score++;
      });

      // Save results
      const result = await pool.query(
        `INSERT INTO quiz_results (quiz_id, student_id, score, total, answers) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          quizId,
          req.user!.id,
          score,
          questions.length,
          JSON.stringify(answers),
        ],
      );

      const row = result.rows[0];
      res.json({
        id: String(row.id),
        quizId: String(row.quiz_id),
        studentId: String(row.student_id),
        score: row.score,
        total: row.total,
        answers: row.answers,
        submittedAt: row.submitted_at,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

// GET /api/quizzes/:id/results/:studentId - Get quiz results
router.get(
  "/:id/results/:studentId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(
        "SELECT * FROM quiz_results WHERE quiz_id = $1 AND student_id = $2 ORDER BY submitted_at DESC LIMIT 1",
        [parseInt(req.params.id), parseInt(req.params.studentId)],
      );

      if (result.rows.length === 0) {
        return res.json(null);
      }

      const row = result.rows[0];
      res.json({
        id: String(row.id),
        quizId: String(row.quiz_id),
        studentId: String(row.student_id),
        score: row.score,
        total: row.total,
        answers: row.answers,
        submittedAt: row.submitted_at,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
