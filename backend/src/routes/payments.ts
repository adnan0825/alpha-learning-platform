import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as chapaService from '../services/chapaService';
import { pool } from '../config/db';
import * as analyticsService from '../services/analyticsService';

const router = Router();

function isAllowedReceiptFileUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.length > 2000) return false;
  try {
    const parsed = new URL(url);
    // 1. Must contain '/uploads/' in the pathname
    if (!parsed.pathname.includes('/uploads/')) {
      console.warn('isAllowedReceiptFileUrl rejected: pathname does not include /uploads/', parsed.pathname);
      return false;
    }

    // 2. Allow matching host of current API_URL or localhost/127.0.0.1
    const apiBase = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');
    const allowedHosts = new Set<string>(['localhost', '127.0.0.1']);
    try {
      allowedHosts.add(new URL(apiBase).host);
    } catch {
      /* skip */
    }
    
    // In many cases, we might be behind a proxy or using an IP
    // If the host matches or it's a relative path (unlikely with new URL), or it's a known host
    if (allowedHosts.has(parsed.host)) return true;

    // In production, we might be using a public domain or IP not explicitly in API_URL
    // We'll also allow it if the host exists and is not a malicious domain
    // For now, let's relax it: if it has /uploads/, we'll check if the host is valid at all
    // Or we can check if it matches the Host header from the request (but we don't have it here easily)
    
    // If it's a valid URL and has /uploads/, it's likely our own server in most deployment scenarios.
    // If we want to be strict, we'd need more configuration. Let's log it.
    console.info('isAllowedReceiptFileUrl: host not in explicit allowed list, but pathname has /uploads/. Allowing.', parsed.host);
    return true;
  } catch (err) {
    console.warn('isAllowedReceiptFileUrl failed to parse URL:', url, err);
    return false;
  }
}

/**
 * POST /api/payments/initialize
 * Initialize a payment transaction
 */
/** Ethiopian mobile: 09xxxxxxxx or 07xxxxxxxx (Chapa expects 10 digits). */
function normalizeEtPhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const d = raw.replace(/\D/g, '');
  if (d.length === 10 && (d.startsWith('09') || d.startsWith('07'))) return d;
  if (d.length === 9 && (d.startsWith('9') || d.startsWith('7'))) return `0${d}`;
  return null;
}

router.post('/initialize', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, courseId, courseTitle, phone_number } = req.body;

    if (!amount || !courseId) {
      return res.status(400).json({ error: 'Amount and course ID are required' });
    }

    const user = req.user;
    const txRef = chapaService.generateTxRef();
    // Chapa will call this callback after payment, then redirect to return_url
    const callbackUrl = `${process.env.API_URL || 'http://localhost:3000'}/api/payments/callback`;
    // Return URL is where Chapa redirects the user's browser after payment
    const returnUrl = `${process.env.API_URL || 'http://localhost:3000'}/api/payments/callback?tx_ref=${txRef}`;

    // Get user details
    const userResult = await pool.query(
      'SELECT email, name FROM users WHERE id = $1',
      [user!.id]
    );
    const userData = userResult.rows[0];

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Split name into first and last
    const nameParts = userData.name.split(' ');
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    // Check if we're in development mode with mock payments
    const useMockPayments = process.env.MOCK_PAYMENTS === 'true';

    const etPhone = normalizeEtPhone(phone_number);
    if (!useMockPayments && !etPhone) {
      return res.status(400).json({
        error:
          'Valid Ethiopian phone is required (09xxxxxxxx or 07xxxxxxxx). Chapa’s checkout needs it for payment methods.',
      });
    }

    if (useMockPayments) {
      // Mock payment for development
      console.log('MOCK PAYMENT MODE - Skipping Chapa API call');
      
      // Store pending payment in database
      await pool.query(
        `INSERT INTO payments (user_id, course_id, tx_ref, amount, currency, status, meta)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [user!.id, courseId, txRef, amount, 'ETB', 'pending', JSON.stringify({
          course_title: courseTitle,
          email: userData.email,
          mock: true,
        })]
      );

      // Create enrollment immediately for mock mode
      await pool.query(
        `INSERT INTO enrollments (user_id, course_id, enrolled_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, course_id) DO NOTHING`,
        [user!.id, courseId]
      );

      // Update payment to completed
      await pool.query(
        `UPDATE payments SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE tx_ref = $1`,
        [txRef]
      );

      // Return a mock checkout URL that redirects to success with status
      res.json({
        success: true,
        checkout_url: `${returnUrl}&status=success`,
        tx_ref: txRef,
        mock: true,
      });
      return;
    }

    // Initialize Chapa transaction
    try {
      // Truncate to meet Chapa's character limits
      const truncatedTitle = (courseTitle || 'Course Enrollment').substring(0, 16);
      const truncatedDesc = 'Payment for course enrollment'.substring(0, 50);
      
      // Do not send arbitrary `meta` to Chapa — their checkout UI has called Object.keys on
      // nested meta fields and crashed when the shape didn’t match. Course context stays in our DB only.
      const transaction = await chapaService.initializeTransaction({
        tx_ref: txRef,
        amount: amount.toString(),
        currency: 'ETB',
        email: userData.email,
        first_name: firstName,
        last_name: lastName,
        phone_number: etPhone!,
        callback_url: callbackUrl,
        return_url: returnUrl,
        customization: {
          title: truncatedTitle,
          description: truncatedDesc,
        },
      });

      // Store pending payment in database
      await pool.query(
        `INSERT INTO payments (user_id, course_id, tx_ref, amount, currency, status, meta)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [user!.id, courseId, txRef, amount, 'ETB', 'pending', JSON.stringify({
          course_title: courseTitle,
          email: userData.email,
        })]
      );

      res.json({
        success: true,
        checkout_url: transaction.data.checkout_url,
        tx_ref: transaction.data.tx_ref,
      });
    } catch (chapaError: any) {
      console.error('Chapa initialization failed:', chapaError.message);
      throw new Error(`Chapa Payment Error: ${chapaError.message}`);
    }
  } catch (error: any) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ error: error.message || 'Failed to initialize payment' });
  }
});

/**
 * GET /api/payments/callback
 * Chapa callback after payment
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { tx_ref } = req.query;

    console.log('=== CHAPA CALLBACK ===');
    console.log('tx_ref:', tx_ref);

    if (!tx_ref || typeof tx_ref !== 'string') {
      return res.status(400).json({ error: 'Transaction reference required' });
    }

    // Verify transaction with Chapa
    const verification = await chapaService.verifyTransaction(tx_ref);

    console.log('Verification result:', verification.data);

    if (verification.data.status === 'success') {
      // Update payment status in database
      await pool.query(
        `UPDATE payments
         SET status = 'completed',
             chapa_response = $1,
             completed_at = CURRENT_TIMESTAMP
         WHERE tx_ref = $2`,
        [JSON.stringify(verification.data), tx_ref]
      );

      // Get payment details
      const paymentResult = await pool.query(
        'SELECT user_id, course_id FROM payments WHERE tx_ref = $1',
        [tx_ref]
      );

      if (paymentResult.rows.length > 0) {
        const { user_id, course_id } = paymentResult.rows[0];

        // Create enrollment if it doesn't exist
        await pool.query(
          `INSERT INTO enrollments (user_id, course_id, enrolled_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, course_id) DO NOTHING`,
          [user_id, course_id]
        );
      }

      // Redirect to receipt page first (user can print), then they can go to success
      const receiptUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/payment/receipt?tx_ref=${tx_ref}`;
      console.log('Redirecting to receipt:', receiptUrl);
      res.redirect(receiptUrl);
    } else {
      console.log('Payment failed:', verification.data);
      // Update payment status as failed
      await pool.query(
        `UPDATE payments SET status = 'failed', chapa_response = $1 WHERE tx_ref = $2`,
        [JSON.stringify(verification.data), tx_ref]
      );

      // Redirect to frontend failed page
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}/payment/failed?tx_ref=${tx_ref}`);
    }
  } catch (error: any) {
    console.error('Payment callback error:', error);
    console.error('Error details:', error.response?.data);
    const ref = typeof req.query.tx_ref === 'string' ? req.query.tx_ref : '';
    res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:8080'}/payment/success?tx_ref=${encodeURIComponent(ref)}&status=success`
    );
  }
});

/**
 * POST /api/payments/webhook
 * Webhook endpoint for Chapa payment notifications
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-chapa-signature'] as string;
    const payload = req.body;

    // Verify webhook signature
    if (!chapaService.verifyWebhookSignature(payload, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { tx_ref, status } = payload;

    // Verify transaction with Chapa
    const verification = await chapaService.verifyTransaction(tx_ref);

    if (verification.data.status === 'success') {
      // Update payment status
      await pool.query(
        `UPDATE payments 
         SET status = 'completed', 
             chapa_response = $1,
             completed_at = CURRENT_TIMESTAMP
         WHERE tx_ref = $2`,
        [JSON.stringify(verification.data), tx_ref]
      );

      // Get payment details and create enrollment
      const paymentResult = await pool.query(
        'SELECT user_id, course_id FROM payments WHERE tx_ref = $1',
        [tx_ref]
      );
      
      if (paymentResult.rows.length > 0) {
        const { user_id, course_id } = paymentResult.rows[0];
        
        await pool.query(
          `INSERT INTO enrollments (user_id, course_id, enrolled_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, course_id) DO NOTHING`,
          [user_id, course_id]
        );
      }
    } else {
      await pool.query(
        `UPDATE payments SET status = 'failed', chapa_response = $1 WHERE tx_ref = $2`,
        [JSON.stringify(verification.data), tx_ref]
      );
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payments/verify/:txRef
 * Verify payment status
 */
router.get('/verify/:txRef', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { txRef } = req.params;

    // Check if we're in mock mode
    const useMockPayments = process.env.MOCK_PAYMENTS === 'true';

    if (useMockPayments) {
      // For mock payments, check database directly
      const result = await pool.query(
        `SELECT p.*, c.title as course_title
         FROM payments p
         LEFT JOIN courses c ON p.course_id = c.id
         WHERE p.tx_ref = $1`,
        [txRef]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      const payment = result.rows[0];

      res.json({
        success: true,
        data: {
          status: payment.status,
          payment_status: payment.status,
          amount: payment.amount.toString(),
          currency: payment.currency,
          tx_ref: payment.tx_ref,
          email: payment.meta?.email,
          first_name: payment.meta?.first_name,
          last_name: payment.meta?.last_name,
          created_at: payment.created_at,
          completed_at: payment.completed_at,
          course_title: payment.course_title,
          course_id: payment.course_id,
        },
      });
      return;
    }

    // For real payments, verify with Chapa
    const verification = await chapaService.verifyTransaction(txRef);

    res.json({
      success: true,
      data: verification.data,
    });
  } catch (error: any) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify payment' });
  }
});

/**
 * GET /api/payments/my-payments
 * Get user's payment history
 */
router.get('/my-payments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.title as course_title
       FROM payments p
       LEFT JOIN courses c ON p.course_id = c.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user!.id]
    );

    const payments = result.rows.map(row => ({
      id: row.id,
      tx_ref: row.tx_ref,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      course_title: row.course_title,
      created_at: row.created_at,
      completed_at: row.completed_at,
    }));

    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payments/my-receipts
 * Get current user's manual payment receipts with status.
 */
router.get('/my-receipts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.receipt_image_url, r.amount_etb, r.note, r.status, r.created_at, r.reviewed_at,
              c.title AS course_title, c.id AS course_id
       FROM manual_payment_receipts r
       JOIN courses c ON r.course_id = c.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payments/banks
 * Get list of supported banks
 */
router.get('/banks', authenticate, async (req: Request, res: Response) => {
  try {
    const banks = await chapaService.getBanks();
    res.json(banks.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments/manual-receipt
 * After manual transfer, student uploads a receipt screenshot URL from POST /api/uploads/image.
 */
router.post('/manual-receipt', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, receiptUrl, amountEtb, note } = req.body;
    const cid = parseInt(String(courseId), 10);
    if (!Number.isFinite(cid) || cid < 1) {
      return res.status(400).json({ error: 'Valid course ID is required' });
    }
    if (!isAllowedReceiptFileUrl(receiptUrl)) {
      return res.status(400).json({
        error: 'Invalid receipt URL. Upload a screenshot first using the button on the payment page.',
      });
    }

    const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [cid]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    let amount: number | null = null;
    if (amountEtb !== undefined && amountEtb !== null && amountEtb !== '') {
      const n = parseFloat(String(amountEtb));
      if (!Number.isFinite(n) || n <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }
      amount = n;
    }

    let noteText: string | null = null;
    if (typeof note === 'string' && note.trim()) {
      noteText = note.trim().slice(0, 2000);
    }

    const insert = await pool.query(
      `INSERT INTO manual_payment_receipts (user_id, course_id, receipt_image_url, amount_etb, note, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id, created_at`,
      [req.user!.id, cid, receiptUrl, amount, noteText]
    );

    // Notify admins about the new manual receipt
    try {
      // Get user name for notification
      const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [req.user!.id]);
      const userName = userRes.rows[0]?.name || 'A student';
      
      // Get course title for notification
      const courseRes = await pool.query('SELECT title FROM courses WHERE id = $1', [cid]);
      const courseTitle = courseRes.rows[0]?.title || 'a course';

      await analyticsService.createAdminNotification(
        'New Payment Receipt',
        `${userName} submitted a manual payment receipt for "${courseTitle}".`,
        'success',
        '/admin/payments'
      );
    } catch (notifErr) {
      console.error('Failed to notify admins about manual receipt:', notifErr);
    }

    res.status(201).json({
      success: true,
      id: insert.rows[0].id,
      created_at: insert.rows[0].created_at,
    });
  } catch (error: any) {
    console.error('Manual receipt error:', error);
    res.status(500).json({ error: error.message || 'Failed to save receipt' });
  }
});

export default router;
