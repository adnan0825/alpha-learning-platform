import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as progressService from '../services/progressService';

const router = Router();

router.post('/lesson/:lessonId/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const progress = await progressService.markLessonComplete(req.user!.id, parseInt(req.params.lessonId));
    res.json(progress);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/lesson/:lessonId/incomplete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const progress = await progressService.markLessonIncomplete(req.user!.id, parseInt(req.params.lessonId));
    res.json(progress);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/course/:courseId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const progress = await progressService.getUserProgress(req.user!.id, parseInt(req.params.courseId));
    res.json(progress);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/course/:courseId/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await progressService.getCourseProgress(req.user!.id, parseInt(req.params.courseId));
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/lesson/:lessonId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const progress = await progressService.getLessonProgress(req.user!.id, parseInt(req.params.lessonId));
    res.json(progress || { completed: false });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
