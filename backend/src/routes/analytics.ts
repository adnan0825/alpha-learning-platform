import { Router, Response } from "express";
import { query } from "../config/db";
import { authenticate, AuthRequest, requireAdmin } from "../middleware/auth";
import * as analyticsService from "../services/analyticsService";

const router = Router();

// ============================================
// BOOKMARKS
// ============================================

// GET /api/analytics/bookmarks - Get user's bookmarks
router.get(
  "/bookmarks",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const bookmarks = await analyticsService.getBookmarks(req.user!.id);
      res.json(bookmarks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// POST /api/analytics/bookmarks/:courseId - Add bookmark
router.post(
  "/bookmarks/:courseId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const bookmark = await analyticsService.addBookmark(
        req.user!.id,
        courseId,
      );
      res.status(201).json(bookmark || { message: "Bookmark already exists" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// DELETE /api/analytics/bookmarks/:courseId - Remove bookmark
router.delete(
  "/bookmarks/:courseId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const result = await analyticsService.removeBookmark(
        req.user!.id,
        courseId,
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// GET /api/analytics/bookmarks/:courseId/check - Check if bookmarked
router.get(
  "/bookmarks/:courseId/check",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const isBookmarked = await analyticsService.isBookmarked(
        req.user!.id,
        courseId,
      );
      res.json({ isBookmarked });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// NOTIFICATIONS
// ============================================

// GET /api/analytics/notifications - Get user's notifications
router.get(
  "/notifications",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const unreadOnly = req.query.unread === "true";
      const notifications = await analyticsService.getNotifications(
        req.user!.id,
        unreadOnly,
      );
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// GET /api/analytics/notifications/count - Get unread count
router.get(
  "/notifications/count",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const count = await analyticsService.getUnreadNotificationCount(
        req.user!.id,
      );
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// PUT /api/analytics/notifications/:id/read - Mark as read
router.put(
  "/notifications/:id/read",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await analyticsService.markNotificationAsRead(
        req.user!.id,
        notificationId,
      );
      res.json(notification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// PUT /api/analytics/notifications/read-all - Mark all as read
router.put(
  "/notifications/read-all",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const result = await analyticsService.markAllNotificationsAsRead(
        req.user!.id,
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// DELETE /api/analytics/notifications/:id - Delete notification
router.delete(
  "/notifications/:id",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const notificationId = parseInt(req.params.id);
      const result = await analyticsService.deleteNotification(
        req.user!.id,
        notificationId,
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// COURSE NOTES
// ============================================

// GET /api/analytics/notes - Get user's notes
router.get("/notes", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.query.courseId
      ? parseInt(req.query.courseId as string)
      : undefined;
    const notes = await analyticsService.getCourseNotes(req.user!.id, courseId);
    res.json(notes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analytics/notes - Create note
router.post("/notes", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, content, lessonIndex, lessonTitle } = req.body;
    const note = await analyticsService.createNote(
      req.user!.id,
      parseInt(courseId),
      content,
      lessonIndex,
      lessonTitle,
    );
    res.status(201).json(note);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/analytics/notes/:id - Update note
router.put(
  "/notes/:id",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { content } = req.body;
      const noteId = parseInt(req.params.id);
      const note = await analyticsService.updateNote(
        req.user!.id,
        noteId,
        content,
      );
      res.json(note);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// DELETE /api/analytics/notes/:id - Delete note
router.delete(
  "/notes/:id",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const noteId = parseInt(req.params.id);
      const result = await analyticsService.deleteNote(req.user!.id, noteId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// ANNOUNCEMENTS
// ============================================

async function canAccessCourseAnnouncements(
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

async function canManageCourseAnnouncement(
  user: NonNullable<AuthRequest["user"]>,
  courseId: number,
) {
  if (user.role === "admin") return true;
  if (user.role !== "instructor") return false;

  const result = await query(
    "SELECT 1 FROM courses WHERE id = $1 AND instructor_id = $2",
    [courseId, user.id],
  );
  return (result.rowCount ?? 0) > 0;
}

// GET /api/analytics/announcements/course/:courseId - Get course announcements
router.get(
  "/announcements/course/:courseId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      if (!Number.isFinite(courseId)) {
        return res.status(400).json({ error: "Invalid course id" });
      }
      if (!(await canAccessCourseAnnouncements(req.user!, courseId))) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const announcements = await analyticsService.getAnnouncements(courseId);
      res.json(announcements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// POST /api/analytics/announcements - Create announcement (instructor only)
router.post(
  "/announcements",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { courseId, title, content, isPinned } = req.body;
      const courseIdNumber = parseInt(courseId, 10);
      if (!Number.isFinite(courseIdNumber)) {
        return res.status(400).json({ error: "Invalid course id" });
      }
      if (!(await canManageCourseAnnouncement(req.user!, courseIdNumber))) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const announcement = await analyticsService.createAnnouncement(
        req.user!.id,
        courseIdNumber,
        title,
        content,
        isPinned,
      );
      res.status(201).json(announcement);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// PUT /api/analytics/announcements/:id - Update announcement
router.put(
  "/announcements/:id",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { title, content, isPinned } = req.body;
      const announcementId = parseInt(req.params.id);
      if (!Number.isFinite(announcementId)) {
        return res.status(400).json({ error: "Invalid announcement id" });
      }
      const existing = await query(
        "SELECT course_id FROM announcements WHERE id = $1",
        [announcementId],
      );
      if ((existing.rowCount ?? 0) === 0) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      const courseId = Number(existing.rows[0].course_id);
      if (!(await canManageCourseAnnouncement(req.user!, courseId))) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const announcement = await analyticsService.updateAnnouncement(
        req.user!.id,
        announcementId,
        title,
        content,
        isPinned,
        req.user!.role,
      );
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      res.json(announcement);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// DELETE /api/analytics/announcements/:id - Delete announcement
router.delete(
  "/announcements/:id",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const announcementId = parseInt(req.params.id);
      if (!Number.isFinite(announcementId)) {
        return res.status(400).json({ error: "Invalid announcement id" });
      }
      const existing = await query(
        "SELECT course_id, instructor_id FROM announcements WHERE id = $1",
        [announcementId],
      );
      if ((existing.rowCount ?? 0) === 0) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      const courseId = Number(existing.rows[0].course_id);
      const isOwnerOrAdmin =
        req.user!.role === "admin" ||
        existing.rows[0].instructor_id === req.user!.id ||
        (await canManageCourseAnnouncement(req.user!, courseId));
      if (!isOwnerOrAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const result = await analyticsService.deleteAnnouncement(
        req.user!.id,
        announcementId,
        req.user!.role,
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// LEARNING PATHS
// ============================================

// GET /api/analytics/learning-paths - Get all learning paths
router.get("/learning-paths", async (req: AuthRequest, res: Response) => {
  try {
    const isActive = req.query.active !== "false";
    const paths = await analyticsService.getLearningPaths(isActive);
    res.json(paths);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/learning-paths/mine - Get the instructor's recent paths
router.get(
  "/learning-paths/mine",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "instructor" && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const paths = await analyticsService.getInstructorLearningPaths(
        req.user!.id,
      );
      res.json(paths);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// GET /api/analytics/learning-paths/:id - Get learning path details
router.get("/learning-paths/:id", async (req: AuthRequest, res: Response) => {
  try {
    const pathId = parseInt(req.params.id);
    const path = await analyticsService.getLearningPathById(pathId);
    if (!path) {
      return res.status(404).json({ error: "Learning path not found" });
    }
    res.json(path);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/learning-paths/:id/courses - Get learning path courses
router.get(
  "/learning-paths/:id/courses",
  async (req: AuthRequest, res: Response) => {
    try {
      const pathId = parseInt(req.params.id);
      const courses = await analyticsService.getLearningPathCourses(pathId);
      res.json(courses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// POST /api/analytics/learning-paths - Create learning path (admin/instructor)
router.post(
  "/learning-paths",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { title, description, courseIds } = req.body;
      const path = await analyticsService.createLearningPath(
        title,
        description,
        req.user!.id,
        courseIds || [],
      );
      res.status(201).json(path);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// PUT /api/analytics/learning-paths/:id - Update learning path
router.put(
  "/learning-paths/:id",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const pathId = parseInt(req.params.id);
      const { title, description, isActive } = req.body;
      const path = await analyticsService.updateLearningPath(
        pathId,
        title,
        description,
        isActive,
      );
      res.json(path);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// DELETE /api/analytics/learning-paths/:id - Delete learning path
router.delete(
  "/learning-paths/:id",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const pathId = parseInt(req.params.id);
      const result = await analyticsService.deleteLearningPath(pathId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// POST /api/analytics/learning-paths/:id/courses - Add course to path
router.post(
  "/learning-paths/:pathId/courses",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const pathId = parseInt(req.params.pathId);
      const { courseId, position } = req.body;
      const result = await analyticsService.addCourseToPath(
        pathId,
        parseInt(courseId),
        position || 0,
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// DELETE /api/analytics/learning-paths/:pathId/courses/:courseId - Remove course from path
router.delete(
  "/learning-paths/:pathId/courses/:courseId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const pathId = parseInt(req.params.pathId);
      const courseId = parseInt(req.params.courseId);
      const result = await analyticsService.removeCourseFromPath(
        pathId,
        courseId,
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// USER LEARNING PATHS
// ============================================

// GET /api/analytics/user/learning-paths - Get user's learning paths
router.get(
  "/user/learning-paths",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const paths = await analyticsService.getUserLearningPaths(req.user!.id);
      res.json(paths);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// POST /api/analytics/user/learning-paths/:pathId - Enroll in learning path
router.post(
  "/user/learning-paths/:pathId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "student") {
        return res
          .status(403)
          .json({ error: "Not authorized - student access required" });
      }

      const pathId = parseInt(req.params.pathId);
      if (!Number.isFinite(pathId)) {
        return res.status(400).json({ error: "Invalid learning path id" });
      }
      const result = await analyticsService.enrollInLearningPath(
        req.user!.id,
        pathId,
      );
      res.status(201).json(result || { message: "Already enrolled" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// PUT /api/analytics/user/learning-paths/:pathId/progress - Update progress
router.put(
  "/user/learning-paths/:pathId/progress",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const pathId = parseInt(req.params.pathId);
      const { progress } = req.body;
      const result = await analyticsService.updateLearningPathProgress(
        req.user!.id,
        pathId,
        progress,
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// LEADERBOARD
// ============================================

// GET /api/analytics/leaderboard - Get student leaderboard
router.get("/leaderboard", async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const leaderboard = await analyticsService.getLeaderboard(limit);
    res.json(leaderboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INSTRUCTOR ANALYTICS
// ============================================

// GET /api/analytics/instructor/revenue - Get instructor revenue
router.get(
  "/instructor/revenue",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const courseId = req.query.courseId
        ? parseInt(req.query.courseId as string)
        : undefined;
      const revenue = await analyticsService.getInstructorRevenue(
        req.user!.id,
        courseId,
      );
      res.json(revenue);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// GET /api/analytics/instructor/stats - Get instructor stats
router.get(
  "/instructor/stats",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const stats = await analyticsService.getInstructorStats(req.user!.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// GET /api/analytics/instructor/quiz-stats/:courseId - Get quiz statistics
router.get(
  "/instructor/quiz-stats/:courseId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const stats = await analyticsService.getQuizStatistics(courseId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// GET /api/analytics/instructor/grades/:courseId - Get student grades
router.get(
  "/instructor/grades/:courseId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const grades = await analyticsService.getStudentGrades(
        req.user!.id,
        courseId,
      );
      res.json(grades);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// ADMIN ANALYTICS (Platform Stats)
// ============================================

// GET /api/analytics/platform - Get platform statistics for admin dashboard
router.get(
  "/platform",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { query } = await import("../config/db");

      const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'instructor') as total_instructors,
        (SELECT COUNT(*) FROM courses) as total_courses,
        (SELECT COUNT(*) FROM enrollments) as total_enrollments,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days') as recent_signups
    `);

      res.json({
        totalUsers: parseInt(stats.rows[0].total_users),
        totalStudents: parseInt(stats.rows[0].total_students),
        totalInstructors: parseInt(stats.rows[0].total_instructors),
        totalCourses: parseInt(stats.rows[0].total_courses),
        totalEnrollments: parseInt(stats.rows[0].total_enrollments),
        recentSignups: parseInt(stats.rows[0].recent_signups),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// GET /api/analytics/growth-trends - Get monthly user/enrollment growth (last 6 months)
router.get(
  "/growth-trends",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { query } = await import("../config/db");

      const growthData = await query(`
      WITH months AS (
        SELECT generate_series(
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months'),
          DATE_TRUNC('month', CURRENT_DATE),
          INTERVAL '1 month'
        )::date as month_start
      ),
      user_counts AS (
        SELECT
          DATE_TRUNC('month', m.month_start)::date as month,
          (SELECT COUNT(*) FROM users WHERE created_at >= m.month_start AND created_at < m.month_start + INTERVAL '1 month') as new_users,
          (SELECT COUNT(*) FROM enrollments WHERE enrolled_at >= m.month_start AND enrolled_at < m.month_start + INTERVAL '1 month') as new_enrollments
        FROM months m
      )
      SELECT
        month as month_start,
        TO_CHAR(month, 'Mon') as month,
        new_users as users,
        new_enrollments as enrollments
      FROM user_counts
      ORDER BY month_start
    `);

      res.json(growthData.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// GET /api/analytics/category-distribution - Get course count by category
router.get(
  "/category-distribution",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { query } = await import("../config/db");

      const categoryData = await query(`
      SELECT
        category as name,
        COUNT(*) as value
      FROM courses
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY value DESC
    `);

      res.json(categoryData.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
