import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as enrollmentService from '../services/enrollmentService';

const router = Router();

// GET /api/enrollments/student/:id - Get student's enrollments
router.get('/student/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const enrollments = await enrollmentService.getUserEnrollments(parseInt(req.params.id));
    res.json(enrollments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/enroll/:courseId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const enrolled = await enrollmentService.isEnrolled(req.user!.id, parseInt(req.params.courseId));
    if (enrolled) {
      return res.status(400).json({ error: 'Already enrolled' });
    }
    const enrollment = await enrollmentService.enrollUser(req.user!.id, parseInt(req.params.courseId));
    res.status(201).json(enrollment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/my-courses', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const enrollments = await enrollmentService.getUserEnrollments(req.user!.id);
    res.json(enrollments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/course/:courseId/enrollments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const enrollments = await enrollmentService.getCourseEnrollments(parseInt(req.params.courseId));
    res.json(enrollments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/course/:courseId/check', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const enrolled = await enrollmentService.isEnrolled(req.user!.id, parseInt(req.params.courseId));
    res.json({ enrolled });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/course/:courseId/review', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rating, comment } = req.body;
    const review = await enrollmentService.createReview(req.user!.id, parseInt(req.params.courseId), rating, comment);
    res.status(201).json(review);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/course/:courseId/reviews', async (req: AuthRequest, res: Response) => {
  try {
    const reviews = await enrollmentService.getCourseReviews(parseInt(req.params.courseId));
    res.json(reviews);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/course/:courseId/rating', async (req: AuthRequest, res: Response) => {
  try {
    const rating = await enrollmentService.getCourseRating(parseInt(req.params.courseId));
    res.json(rating);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
