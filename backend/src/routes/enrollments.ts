import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import * as enrollmentService from "../services/enrollmentService";
import { autoIssue } from "../services/certificateService";

const router = Router();

// GET /api/enrollments/student/:id - Get student's enrollments
router.get(
  "/student/:id",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const studentId = parseInt(req.params.id, 10);
      if (!Number.isFinite(studentId)) {
        return res.status(400).json({ error: "Invalid student ID" });
      }
      if (req.user!.id !== studentId && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }
      const enrollments = await enrollmentService.getUserEnrollments(studentId);
      res.json(enrollments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/enroll/:courseId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const enrolled = await enrollmentService.isEnrolled(
        req.user!.id,
        parseInt(req.params.courseId),
      );
      if (enrolled) {
        return res.status(400).json({ error: "Already enrolled" });
      }
      const enrollment = await enrollmentService.enrollUser(
        req.user!.id,
        parseInt(req.params.courseId),
      );
      res.status(201).json(enrollment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

router.get(
  "/my-courses",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const enrollments = await enrollmentService.getUserEnrollments(
        req.user!.id,
      );
      res.json(enrollments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  "/course/:courseId/enrollments",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const enrollments = await enrollmentService.getCourseEnrollments(
        parseInt(req.params.courseId),
      );
      res.json(enrollments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  "/course/:courseId/check",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const enrolled = await enrollmentService.isEnrolled(
        req.user!.id,
        parseInt(req.params.courseId),
      );
      res.json({ enrolled });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.put(
  "/:id/progress",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const enrollmentId = parseInt(req.params.id, 10);
      const completedVideos = Array.isArray(req.body.completedVideos)
        ? req.body.completedVideos.filter(
            (value: unknown): value is string => typeof value === "string",
          )
        : [];
      if (!Number.isFinite(enrollmentId)) {
        return res
          .status(400)
          .json({ error: "Valid enrollment progress is required" });
      }

      const result = await enrollmentService.updateEnrollmentProgress(
        req.user!.id,
        enrollmentId,
        completedVideos,
      );
      if (!result)
        return res.status(404).json({ error: "Enrollment not found" });

      if (result.progress === 100) {
        try {
          await autoIssue(req.user!.id, Number(result.courseId));
        } catch (error) {
          console.error("Certificate auto-issuance failed:", error);
        }
      }
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

router.post(
  "/course/:courseId/review",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { rating, comment } = req.body;
      const review = await enrollmentService.createReview(
        req.user!.id,
        parseInt(req.params.courseId),
        rating,
        comment,
      );
      res.status(201).json(review);
    } catch (error: any) {
      const message = error?.message || "Could not create review";
      if (message.includes("enroll in the course")) {
        return res.status(403).json({ error: message });
      }
      if (message.includes("already reviewed")) {
        return res.status(409).json({ error: message });
      }
      res.status(400).json({ error: message });
    }
  },
);

router.get(
  "/course/:courseId/reviews",
  async (req: AuthRequest, res: Response) => {
    try {
      const reviews = await enrollmentService.getCourseReviews(
        parseInt(req.params.courseId),
      );
      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  "/course/:courseId/rating",
  async (req: AuthRequest, res: Response) => {
    try {
      const rating = await enrollmentService.getCourseRating(
        parseInt(req.params.courseId),
      );
      res.json(rating);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
