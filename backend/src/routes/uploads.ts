import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth';

const router = Router();
const uploadsDir = path.join(__dirname, '../../uploads'); // Match static serving: backend/uploads

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uniqueSuffix}-${safeName || 'file'}`);
  },
});

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i;

/** Screenshots / thumbnails: images only (manual payment receipts use this too). */
const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const base = path.basename(file.originalname || '');
    const ext = path.extname(base).toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    const imgMime = mime.startsWith('image/') && mime !== 'image/svg+xml';
    const imgExt = IMAGE_EXT.test(ext);
    const looseMime =
      mime === 'application/octet-stream' || mime === 'binary/octet-stream' || mime === '';

    if (imgExt && (imgMime || looseMime)) return cb(null, true);
    if (imgMime) return cb(null, true);

    cb(new Error('Only image files are allowed (e.g. JPG or PNG screenshot, max 5MB)'));
  },
});

/**
 * POST /api/uploads/image
 * Field `image`. Payment receipt screenshots + course images.
 */
router.post('/image', authenticate, imageUpload.single('image'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageUrl = `${process.env.API_URL || 'http://localhost:3000'}/uploads/${req.file.filename}`;

    res.json({ url: imageUrl });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

router.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Multer error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size too large. Maximum size is 5MB' });
  }
  res.status(400).json({ error: err.message || 'Upload failed' });
});

export default router;
