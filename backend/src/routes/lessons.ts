import { Router, Response } from "express";
import { authenticate, AuthRequest, authorize } from "../middleware/auth";
import * as lessonService from "../services/lessonService";
import { query } from "../config/db";

const router = Router();

router.get("/course/:courseId", async (req: AuthRequest, res: Response) => {
  try {
    const modules = await lessonService.getModules(
      parseInt(req.params.courseId),
    );
    res.json(modules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post(
  "/course/:courseId",
  authenticate,
  authorize("instructor", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { title, description, position } = req.body;
      const module_ = await lessonService.createModule(
        parseInt(req.params.courseId),
        { title, description, position },
      );
      res.status(201).json(module_);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

router.put(
  "/:id",
  authenticate,
  authorize("instructor", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const module_ = await lessonService.updateModule(
        parseInt(req.params.id),
        req.body,
      );
      res.json(module_);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.delete(
  "/:id",
  authenticate,
  authorize("instructor", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      await lessonService.deleteModule(parseInt(req.params.id));
      res.json({ message: "Module deleted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  "/module/:moduleId/lessons",
  async (req: AuthRequest, res: Response) => {
    try {
      const lessons = await lessonService.getLessonsByModule(
        parseInt(req.params.moduleId),
      );
      res.json(lessons);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/module/:moduleId/lessons",
  authenticate,
  authorize("instructor", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { title, content, video_url, duration, position, is_free } =
        req.body;
      const lesson = await lessonService.createLesson(
        parseInt(req.params.moduleId),
        { title, content, video_url, duration, position, is_free },
      );
      res.status(201).json(lesson);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

router.get("/lessons/:id", async (req: AuthRequest, res: Response) => {
  try {
    const lesson = await lessonService.getLessonById(parseInt(req.params.id));
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }
    res.json(lesson);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put(
  "/lessons/:id",
  authenticate,
  authorize("instructor", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        const owner = await query(
          "SELECT c.instructor_id FROM lessons l JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id WHERE l.id = $1",
          [parseInt(req.params.id, 10)],
        );
        if (
          !owner.rows[0] ||
          Number(owner.rows[0].instructor_id) !== req.user!.id
        ) {
          return res
            .status(403)
            .json({ error: "You can only edit lessons in your own courses" });
        }
      }
      const lesson = await lessonService.updateLesson(
        parseInt(req.params.id),
        req.body,
      );
      res.json(lesson);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.delete(
  "/lessons/:id",
  authenticate,
  authorize("instructor", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      await lessonService.deleteLesson(parseInt(req.params.id));
      res.json({ message: "Lesson deleted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
