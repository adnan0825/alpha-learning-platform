/**
 * Backend Placeholder - Node.js/Express.js + PostgreSQL
 *
 * This file serves as a reference blueprint for the backend server.
 * It is NOT executed by the frontend — it's a development reference.
 *
 * To set up the backend:
 * 1. Create a new directory: mkdir server && cd server
 * 2. npm init -y
 * 3. npm install express cors helmet morgan pg bcryptjs jsonwebtoken multer dotenv
 * 4. npm install -D typescript @types/express @types/node @types/cors @types/bcryptjs @types/jsonwebtoken @types/multer ts-node nodemon
 * 5. Copy this file as server/src/index.ts
 * 6. Create .env with DATABASE_URL and JWT_SECRET
 * 7. npx ts-node src/index.ts
 */

// ============================================================
// server/src/index.ts
// ============================================================

/*
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'sota-secret-change-me';

// ============ Database ============
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/sota_db',
});

// ============ Middleware ============
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============ Auth Middleware ============
interface AuthRequest extends express.Request {
  userId?: string;
  userRole?: string;
}

const authenticate = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (...roles: string[]) => (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.userRole || !roles.includes(req.userRole)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// ============ File Upload ============
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ============ AUTH ROUTES ============

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, role = 'student' } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, display_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, display_name, role, created_at',
      [email, hashedPassword, name, role]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role, createdAt: user.created_at }, token });
  } catch (err: any) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role, photoURL: user.photo_url, bio: user.bio, createdAt: user.created_at }, token });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ USERS ROUTES ============

// GET /api/users (admin only)
app.get('/api/users', authenticate, requireRole('admin'), async (req, res) => {
  const result = await pool.query('SELECT id, email, display_name, role, photo_url, bio, created_at FROM users ORDER BY created_at DESC');
  res.json(result.rows.map(u => ({ id: u.id, email: u.email, displayName: u.display_name, role: u.role, photoURL: u.photo_url, bio: u.bio, createdAt: u.created_at })));
});

// GET /api/users/:id
app.get('/api/users/:id', authenticate, async (req, res) => {
  const result = await pool.query('SELECT id, email, display_name, role, photo_url, bio, created_at FROM users WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
  const u = result.rows[0];
  res.json({ id: u.id, email: u.email, displayName: u.display_name, role: u.role, photoURL: u.photo_url, bio: u.bio, createdAt: u.created_at });
});

// PUT /api/users/:id
app.put('/api/users/:id', authenticate, async (req, res) => {
  const { displayName, bio, photoURL } = req.body;
  const result = await pool.query(
    'UPDATE users SET display_name = COALESCE($1, display_name), bio = COALESCE($2, bio), photo_url = COALESCE($3, photo_url) WHERE id = $4 RETURNING *',
    [displayName, bio, photoURL, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
  const u = result.rows[0];
  res.json({ id: u.id, email: u.email, displayName: u.display_name, role: u.role, photoURL: u.photo_url, bio: u.bio, createdAt: u.created_at });
});

// DELETE /api/users/:id (admin only)
app.delete('/api/users/:id', authenticate, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// ============ COURSES ROUTES ============

// GET /api/courses
app.get('/api/courses', async (req, res) => {
  const status = req.query.status;
  const query = status
    ? 'SELECT * FROM courses WHERE status = $1 ORDER BY created_at DESC'
    : 'SELECT * FROM courses ORDER BY created_at DESC';
  const params = status ? [status] : [];
  const result = await pool.query(query, params);
  res.json(result.rows.map(c => ({
    id: c.id, title: c.title, description: c.description, category: c.category,
    thumbnail: c.thumbnail, videoLinks: c.video_links, totalVideos: c.total_videos,
    instructorId: c.instructor_id, instructorName: c.instructor_name,
    enrolledCount: c.enrolled_count, status: c.status, difficulty: c.difficulty,
    duration: c.duration, createdAt: c.created_at,
  })));
});

// GET /api/courses/:id
app.get('/api/courses/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM courses WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Course not found' });
  const c = result.rows[0];
  res.json({
    id: c.id, title: c.title, description: c.description, category: c.category,
    thumbnail: c.thumbnail, videoLinks: c.video_links, totalVideos: c.total_videos,
    instructorId: c.instructor_id, instructorName: c.instructor_name,
    enrolledCount: c.enrolled_count, status: c.status, difficulty: c.difficulty,
    duration: c.duration, createdAt: c.created_at,
  });
});

// POST /api/courses (instructor)
app.post('/api/courses', authenticate, requireRole('instructor', 'admin'), async (req, res) => {
  const { title, description, category, thumbnail, videoLinks, totalVideos, instructorName, status, difficulty, duration } = req.body;
  const result = await pool.query(
    `INSERT INTO courses (title, description, category, thumbnail, video_links, total_videos, instructor_id, instructor_name, status, difficulty, duration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [title, description, category, thumbnail, JSON.stringify(videoLinks), totalVideos, (req as AuthRequest).userId, instructorName, status || 'draft', difficulty || 'beginner', duration]
  );
  const c = result.rows[0];
  res.json({
    id: c.id, title: c.title, description: c.description, category: c.category,
    thumbnail: c.thumbnail, videoLinks: c.video_links, totalVideos: c.total_videos,
    instructorId: c.instructor_id, instructorName: c.instructor_name,
    enrolledCount: c.enrolled_count, status: c.status, difficulty: c.difficulty,
    duration: c.duration, createdAt: c.created_at,
  });
});

// PUT /api/courses/:id
app.put('/api/courses/:id', authenticate, requireRole('instructor', 'admin'), async (req, res) => {
  const fields = req.body;
  // Dynamic update - simplified
  const result = await pool.query('UPDATE courses SET title = COALESCE($1, title), status = COALESCE($2, status) WHERE id = $3 RETURNING *',
    [fields.title, fields.status, req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Course not found' });
  res.json(result.rows[0]);
});

// DELETE /api/courses/:id (admin only)
app.delete('/api/courses/:id', authenticate, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM courses WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// GET /api/courses/instructor/:id
app.get('/api/courses/instructor/:id', authenticate, async (req, res) => {
  const result = await pool.query('SELECT * FROM courses WHERE instructor_id = $1 ORDER BY created_at DESC', [req.params.id]);
  res.json(result.rows);
});

// ============ ENROLLMENTS ROUTES ============

// GET /api/enrollments/student/:id
app.get('/api/enrollments/student/:id', authenticate, async (req, res) => {
  const result = await pool.query('SELECT * FROM enrollments WHERE student_id = $1', [req.params.id]);
  res.json(result.rows.map(e => ({
    id: e.id, studentId: e.student_id, courseId: e.course_id,
    progress: e.progress, completedVideos: e.completed_videos, enrolledAt: e.enrolled_at,
  })));
});

// POST /api/enrollments
app.post('/api/enrollments', authenticate, async (req, res) => {
  const { studentId, courseId } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) RETURNING *',
      [studentId, courseId]
    );
    await pool.query('UPDATE courses SET enrolled_count = enrolled_count + 1 WHERE id = $1', [courseId]);
    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(400).json({ error: 'Already enrolled' });
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/enrollments/:id/progress
app.put('/api/enrollments/:id/progress', authenticate, async (req, res) => {
  const { completedVideos, progress } = req.body;
  const result = await pool.query(
    'UPDATE enrollments SET completed_videos = $1, progress = $2 WHERE id = $3 RETURNING *',
    [completedVideos, progress, req.params.id]
  );
  res.json(result.rows[0]);
});

// ============ QUIZZES ROUTES ============

// GET /api/quizzes/course/:courseId
app.get('/api/quizzes/course/:courseId', authenticate, async (req, res) => {
  const result = await pool.query('SELECT * FROM quizzes WHERE course_id = $1', [req.params.courseId]);
  res.json(result.rows.map(q => ({
    id: q.id, courseId: q.course_id, title: q.title, questions: q.questions, createdAt: q.created_at,
  })));
});

// POST /api/quizzes/:id/submit
app.post('/api/quizzes/:id/submit', authenticate, async (req, res) => {
  const { studentId, answers } = req.body;
  const quizResult = await pool.query('SELECT * FROM quizzes WHERE id = $1', [req.params.id]);
  const quiz = quizResult.rows[0];
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  let score = 0;
  const questions = quiz.questions;
  questions.forEach((q: any, i: number) => {
    if (answers[i] === q.correctIndex) score++;
  });

  const result = await pool.query(
    'INSERT INTO quiz_results (quiz_id, student_id, score, total, answers) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [req.params.id, studentId, score, questions.length, JSON.stringify(answers)]
  );
  res.json(result.rows[0]);
});

// ============ CERTIFICATES ROUTES ============

// GET /api/certificates/student/:studentId
app.get('/api/certificates/student/:studentId', authenticate, async (req, res) => {
  const result = await pool.query(
    `SELECT c.*, u.display_name as student_name, co.title as course_title
     FROM certificates c
     JOIN users u ON c.student_id = u.id
     JOIN courses co ON c.course_id = co.id
     WHERE c.student_id = $1`,
    [req.params.studentId]
  );
  res.json(result.rows.map(cert => ({
    id: cert.id, studentId: cert.student_id, studentName: cert.student_name,
    courseId: cert.course_id, courseTitle: cert.course_title,
    issuedAt: cert.issued_at, certificateNumber: cert.certificate_number,
  })));
});

// POST /api/certificates
app.post('/api/certificates', authenticate, async (req, res) => {
  const { studentId, courseId } = req.body;
  const certNumber = `SOTA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
  const result = await pool.query(
    'INSERT INTO certificates (student_id, course_id, certificate_number) VALUES ($1, $2, $3) RETURNING *',
    [studentId, courseId, certNumber]
  );
  res.json(result.rows[0]);
});

// ============ DISCUSSIONS ROUTES ============

// GET /api/discussions/course/:courseId
app.get('/api/discussions/course/:courseId', authenticate, async (req, res) => {
  const result = await pool.query(
    `SELECT d.*, u.display_name as user_name, u.role as user_role
     FROM discussions d
     JOIN users u ON d.user_id = u.id
     WHERE d.course_id = $1
     ORDER BY d.created_at ASC`,
    [req.params.courseId]
  );
  const all = result.rows.map(d => ({
    id: d.id, courseId: d.course_id, lessonIndex: d.lesson_index,
    userId: d.user_id, userName: d.user_name, userRole: d.user_role,
    content: d.content, parentId: d.parent_id, createdAt: d.created_at,
  }));
  // Build tree
  const topLevel = all.filter(d => !d.parentId);
  res.json(topLevel.map(d => ({ ...d, replies: all.filter(r => r.parentId === d.id) })));
});

// POST /api/discussions
app.post('/api/discussions', authenticate, async (req, res) => {
  const { courseId, lessonIndex, content, parentId } = req.body;
  const result = await pool.query(
    'INSERT INTO discussions (course_id, lesson_index, user_id, content, parent_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [courseId, lessonIndex, (req as AuthRequest).userId, content, parentId || null]
  );
  res.json(result.rows[0]);
});

// ============ UPLOADS ROUTES ============

// POST /api/uploads/image
app.post('/api/uploads/image', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url });
});

// ============ ANALYTICS ROUTES ============

// GET /api/analytics/platform (admin only)
app.get('/api/analytics/platform', authenticate, requireRole('admin'), async (req, res) => {
  const users = await pool.query('SELECT COUNT(*) as total, role FROM users GROUP BY role');
  const courses = await pool.query('SELECT COUNT(*) as total FROM courses');
  const enrollments = await pool.query('SELECT COUNT(*) as total FROM enrollments');
  const recentSignups = await pool.query("SELECT COUNT(*) as total FROM users WHERE created_at > NOW() - INTERVAL '30 days'");

  const usersByRole: Record<string, number> = {};
  users.rows.forEach(r => { usersByRole[r.role] = parseInt(r.total); });

  res.json({
    totalUsers: Object.values(usersByRole).reduce((a, b) => a + b, 0),
    totalStudents: usersByRole['student'] || 0,
    totalInstructors: usersByRole['instructor'] || 0,
    totalCourses: parseInt(courses.rows[0].total),
    totalEnrollments: parseInt(enrollments.rows[0].total),
    recentSignups: parseInt(recentSignups.rows[0].total),
  });
});

// ============ Start Server ============
app.listen(PORT, () => {
  console.log(`🚀 Alpha API running on port ${PORT}`);
});
*/

// ============================================================
// Database Migration SQL (run this first in your PostgreSQL)
// ============================================================
export const MIGRATION_SQL = `
-- Alpha - Database Schema
-- Run this SQL in your PostgreSQL database to set up all tables.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
  photo_url TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  thumbnail TEXT,
  video_links JSONB NOT NULL DEFAULT '[]',
  total_videos INT DEFAULT 0,
  instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  instructor_name VARCHAR(255),
  enrolled_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('published', 'draft', 'archived')),
  difficulty VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  progress INT DEFAULT 0,
  completed_videos TEXT[] DEFAULT '{}',
  enrolled_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255),
  questions JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score INT,
  total INT,
  answers JSONB,
  submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  issued_at TIMESTAMP DEFAULT NOW(),
  certificate_number VARCHAR(50) UNIQUE
);

CREATE TABLE discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_index INT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_quizzes_course ON quizzes(course_id);
CREATE INDEX idx_quiz_results_student ON quiz_results(student_id);
CREATE INDEX idx_certificates_student ON certificates(student_id);
CREATE INDEX idx_discussions_course ON discussions(course_id);
CREATE INDEX idx_discussions_parent ON discussions(parent_id);

-- Seed admin user (password: admin123)
INSERT INTO users (email, password_hash, display_name, role)
VALUES ('admin@sota.com', '$2a$10$xVqYLkQQ4LCsWmK5R1nUZeNtBvN6V5eQO.9PQMmPz.7jJ6jH6H3oK', 'Admin User', 'admin');
`;

// ============================================================
// Package.json for the backend (server/package.json)
// ============================================================
export const BACKEND_PACKAGE_JSON = {
  name: "alpha-backend",
  version: "1.0.0",
  description: "Alpha - Backend API",
  main: "src/index.ts",
  scripts: {
    dev: "nodemon --exec ts-node src/index.ts",
    build: "tsc",
    start: "node dist/index.js",
    migrate: "psql $DATABASE_URL -f migrations/001_init.sql",
  },
  dependencies: {
    express: "^4.18.2",
    cors: "^2.8.5",
    helmet: "^7.1.0",
    morgan: "^1.10.0",
    pg: "^8.12.0",
    bcryptjs: "^2.4.3",
    jsonwebtoken: "^9.0.2",
    multer: "^1.4.5-lts.1",
    dotenv: "^16.4.5",
  },
  devDependencies: {
    typescript: "^5.4.0",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "@types/cors": "^2.8.17",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/multer": "^1.4.11",
    "@types/morgan": "^1.9.9",
    "@types/pg": "^8.10.9",
    "ts-node": "^10.9.2",
    nodemon: "^3.1.0",
  },
};

// ============================================================
// Environment Variables Template (server/.env.example)
// ============================================================
export const ENV_TEMPLATE = `
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/sota_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-me

# Server
PORT=5000
FRONTEND_URL=http://localhost:5173

# File Storage (optional - for cloud storage later)
# AWS_S3_BUCKET=sota-uploads
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
`.trim();
