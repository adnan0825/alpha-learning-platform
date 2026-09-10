import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as feedbackService from '../services/feedbackService';

const router = Router();

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { subject, message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }
    const userId = req.user?.id;
    const row = await feedbackService.submitFeedback(userId, subject, message);
    res.status(201).json({
      id: String(row.id),
      userId: userId ? String(row.user_id) : null,
      subject: row.subject,
      message: row.message,
      createdAt: row.created_at,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
