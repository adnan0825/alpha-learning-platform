import { Router, Response } from "express";
import { authenticate, AuthRequest, authorize } from "../middleware/auth";
import * as courseService from "../services/courseService";
import { query } from "../config/db";

const router = Router();

/** Whitelist PUT body. Prefer snake_case from client (matches DB columns if anything builds SQL from keys). */
function pickCourseUpdateBody(
  body: unknown,
): Parameters<typeof courseService.updateCourse>[1] {
  const b =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  const keys = [
    "title",
    "description",
    "category",
    "thumbnail",
    "status",
    "difficulty",
    "duration",
    "price",
    "video_links",
    "videoLinks",
    "total_videos",
    "totalVideos",
    "intro_video_url",
    "introVideoUrl",
    "intro_video_title",
    "introVideoTitle",
  ] as const;
  for (const k of keys) {
    if (b[k] !== undefined) out[k] = b[k];
  }
  return out as Parameters<typeof courseService.updateCourse>[1];
}

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { category, difficulty, instructor_id, published } = req.query;
    const courses = await courseService.getCourses({
      category: category as string,
      difficulty: difficulty as string,
      instructor_id: instructor_id
        ? parseInt(instructor_id as string)
        : undefined,
      is_published: published !== undefined ? published === "true" : undefined,
    });
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const course = await courseService.getCourseById(parseInt(req.params.id));
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.json(course);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post(
  "/",
  authenticate,
  authorize("instructor", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        title,
        description,
        thumbnail,
        introVideoUrl,
        introVideoTitle,
        category,
        difficulty,
        price,
        videoLinks,
        totalVideos,
        duration,
      } = req.body;
      const course = await courseService.createCourse({
        title,
        description,
        thumbnail,
        introVideoUrl,
        introVideoTitle,
        instructor_id: req.user!.id,
        category,
        difficulty,
        price,
        videoLinks,
        totalVideos,
        duration,
      });
      res.status(201).json(course);
    } catch (error: any) {
      console.error("Create course error:", error);
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
      if (req.user!.role !== "admin") {
        const owner = await query(
          "SELECT instructor_id FROM courses WHERE id = $1",
          [parseInt(req.params.id, 10)],
        );
        if (
          !owner.rows[0] ||
          Number(owner.rows[0].instructor_id) !== req.user!.id
        ) {
          return res
            .status(403)
            .json({ error: "You can only edit your own courses" });
        }
      }
      const course = await courseService.updateCourse(
        parseInt(req.params.id),
        pickCourseUpdateBody(req.body),
      );
      if (!course) {
        return res
          .status(404)
          .json({ error: "Course not found or nothing to update" });
      }
      res.json(course);
    } catch (error: any) {
      console.error("Update course error:", error);
      const msg = error?.message || "Update failed";
      const code = error?.code as string | undefined;
      if (code === "42703") {
        const staleApi =
          /introvideourl/i.test(msg) || /introvideotitle/i.test(msg)
            ? "The running server is using old code that sent camelCase column names to PostgreSQL. Rebuild and restart: cd backend && npm run build && npm start (or npm run dev from current source). "
            : "";
        return res.status(500).json({
          error: `${staleApi}If the error names intro_video_url, add columns: npm run db:schema — or: psql -f scripts/add-intro-video-columns.sql. Raw: ${msg}`,
        });
      }
      if (code === "22P02") {
        return res.status(400).json({
          error:
            "Invalid JSON for video_links. Restart the backend after updating, then save again. If it persists, check each lesson has title/url as plain text.",
        });
      }
      res.status(500).json({ error: msg });
    }
  },
);

router.delete(
  "/:id",
  authenticate,
  authorize("instructor", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        const owner = await query(
          "SELECT instructor_id FROM courses WHERE id = $1",
          [parseInt(req.params.id, 10)],
        );
        if (
          !owner.rows[0] ||
          Number(owner.rows[0].instructor_id) !== req.user!.id
        ) {
          return res
            .status(403)
            .json({ error: "You can only delete your own courses" });
        }
      }
      await courseService.deleteCourse(parseInt(req.params.id));
      res.json({ message: "Course deleted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get("/:id/modules", async (req: AuthRequest, res: Response) => {
  try {
    const modules = await courseService.getCourseModules(
      parseInt(req.params.id),
    );
    res.json(modules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/courses/instructor/:id - Get courses by instructor
router.get("/instructor/:id", async (req: AuthRequest, res: Response) => {
  try {
    const courses = await courseService.getCourses({
      instructor_id: parseInt(req.params.id),
    });
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
