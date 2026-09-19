import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import * as progressService from "../services/progressService";

const router = Router();

router.post(
  "/lesson/:lessonId/complete",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const lessonId = parseInt(req.params.lessonId, 10);
      if (!Number.isFinite(lessonId))
        return res.status(400).json({ error: "Invalid lesson ID" });
      const progress = await progressService.markLessonComplete(
        req.user!.id,
        lessonId,
      );
      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/lesson/:lessonId/incomplete",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const lessonId = parseInt(req.params.lessonId, 10);
      if (!Number.isFinite(lessonId))
        return res.status(400).json({ error: "Invalid lesson ID" });
      const progress = await progressService.markLessonIncomplete(
        req.user!.id,
        lessonId,
      );
      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  "/course/:courseId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId, 10);
      if (!Number.isFinite(courseId))
        return res.status(400).json({ error: "Invalid course ID" });
      const progress = await progressService.getUserProgress(
        req.user!.id,
        courseId,
      );
      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  "/course/:courseId/stats",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId, 10);
      if (!Number.isFinite(courseId))
        return res.status(400).json({ error: "Invalid course ID" });
      const stats = await progressService.getCourseProgress(
        req.user!.id,
        courseId,
      );
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  "/lesson/:lessonId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const lessonId = parseInt(req.params.lessonId, 10);
      if (!Number.isFinite(lessonId))
        return res.status(400).json({ error: "Invalid lesson ID" });
      const progress = await progressService.getLessonProgress(
        req.user!.id,
        lessonId,
      );
      res.json(progress || { completed: false });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  "/course/:courseId/videos",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId, 10);
      if (!Number.isFinite(courseId))
        return res.status(400).json({ error: "Invalid course ID" });
      const progress = await progressService.getCourseVideoWatchProgress(
        req.user!.id,
        courseId,
      );
      res.json(progress);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

router.post(
  "/course/:courseId/videos/:videoIndex",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId, 10);
      const videoIndex = parseInt(req.params.videoIndex, 10);
      const { positionSeconds, durationSeconds, playing, ended } =
        req.body || {};
      if (!Number.isFinite(courseId) || !Number.isFinite(videoIndex)) {
        return res.status(400).json({ error: "Invalid course or video index" });
      }
      const progress = await progressService.recordVideoWatchProgress(
        req.user!.id,
        courseId,
        videoIndex,
        Number(positionSeconds),
        Number(durationSeconds),
        Boolean(playing),
        Boolean(ended),
      );
      res.json(progress);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

export default router;
