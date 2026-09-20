-- Migration: Add missing tables for full functionality
-- Date: 2026-03-11

-- ============================================
-- BOOKMARKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_course ON bookmarks(course_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'course', 'quiz', 'assignment', 'certificate')),
    read BOOLEAN DEFAULT false,
    link VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('info', 'success', 'warning', 'error', 'course', 'quiz', 'assignment', 'certificate'));

-- ============================================
-- COURSE NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS course_notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    lesson_index INTEGER,
    lesson_title VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_notes_user ON course_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_course_notes_course ON course_notes(course_id);

-- ============================================
-- ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    instructor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_announcements_instructor ON announcements(instructor_id);

-- ============================================
-- LEARNING PATHS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS learning_paths (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_learning_paths_created_by ON learning_paths(created_by);

-- ============================================
-- LEARNING PATH COURSES (Junction Table)
-- ============================================
CREATE TABLE IF NOT EXISTS learning_path_courses (
    id SERIAL PRIMARY KEY,
    learning_path_id INTEGER REFERENCES learning_paths(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(learning_path_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_path_courses_path ON learning_path_courses(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_courses_course ON learning_path_courses(course_id);

-- ============================================
-- USER LEARNING PATHS (Track user progress in paths)
-- ============================================
CREATE TABLE IF NOT EXISTS user_learning_paths (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    learning_path_id INTEGER REFERENCES learning_paths(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    progress INTEGER DEFAULT 0,
    UNIQUE(user_id, learning_path_id)
);

CREATE INDEX IF NOT EXISTS idx_user_learning_paths_user ON user_learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_paths_path ON user_learning_paths(learning_path_id);

-- ============================================
-- QUIZZES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quizzes (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quizzes_course ON quizzes(course_id);

-- ============================================
-- QUIZ RESULTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_results (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total INTEGER NOT NULL,
    answers JSONB DEFAULT '[]',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz ON quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_student ON quiz_results(student_id);

-- ============================================
-- LEADERBOARD VIEW (Materialized View for Performance)
-- ============================================
CREATE OR REPLACE VIEW leaderboard AS
SELECT
    u.id,
    u.name,
    u.email,
    u.avatar,
    COUNT(DISTINCT e.course_id) AS courses_enrolled,
    COUNT(DISTINCT completed_courses.course_id) AS courses_completed,
    COUNT(DISTINCT completed_lessons.lesson_id) AS lessons_completed,
    COUNT(DISTINCT c.id) AS certificates_earned,
    AVG(r.rating) AS average_rating,
    COUNT(DISTINCT r.id) AS reviews_given
FROM users u
LEFT JOIN enrollments e ON u.id = e.user_id
LEFT JOIN (
    SELECT user_id, course_id
    FROM enrollments
    WHERE progress >= 100
) AS completed_courses ON completed_courses.user_id = u.id
LEFT JOIN (
    SELECT p.user_id, p.lesson_id
    FROM progress p
    WHERE p.completed = true
) AS completed_lessons ON completed_lessons.user_id = u.id
LEFT JOIN certificates c ON u.id = c.student_id
LEFT JOIN reviews r ON u.id = r.user_id
WHERE u.role = 'student'
GROUP BY u.id, u.name, u.email, u.avatar
ORDER BY courses_completed DESC, lessons_completed DESC, certificates_earned DESC;

-- ============================================
-- REVENUE VIEW (For Instructor Revenue Tracking)
-- ============================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS admin_share DECIMAL(12, 2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS instructor_share DECIMAL(12, 2);
INSERT INTO payments (
    user_id, course_id, tx_ref, amount, currency, status, meta,
    completed_at, admin_share, instructor_share
)
SELECT
    r.user_id,
    r.course_id,
    CONCAT('manual-receipt-', r.id),
    c.price,
    'ETB',
    'completed',
    jsonb_build_object('source', 'manual_receipt_repair', 'receiptId', r.id),
    COALESCE(r.reviewed_at, r.created_at),
    ROUND(c.price * 0.20, 2),
    c.price - ROUND(c.price * 0.20, 2)
FROM manual_payment_receipts r
JOIN courses c ON c.id = r.course_id
WHERE r.status = 'approved'
ON CONFLICT (tx_ref) DO NOTHING;
INSERT INTO enrollments (user_id, course_id)
SELECT r.user_id, r.course_id
FROM manual_payment_receipts r
WHERE r.status = 'approved'
ON CONFLICT (user_id, course_id) DO NOTHING;
DELETE FROM enrollments e
USING courses c
WHERE c.id = e.course_id
    AND COALESCE(c.price, 0) > 0
    AND NOT EXISTS (
        SELECT 1 FROM payments p
        WHERE p.user_id = e.user_id
            AND p.course_id = e.course_id
            AND p.status = 'completed'
    );
UPDATE payments p
SET amount = c.price,
    admin_share = ROUND(c.price * 0.20, 2),
    instructor_share = c.price - ROUND(c.price * 0.20, 2)
FROM courses c
WHERE p.course_id = c.id AND p.status = 'completed';

DROP VIEW IF EXISTS instructor_revenue;
CREATE VIEW instructor_revenue AS
SELECT 
    u.id as instructor_id,
    u.name as instructor_name,
    c.id as course_id,
    c.title as course_title,
    COUNT(DISTINCT e.id) as total_enrollments,
    COALESCE(COUNT(DISTINCT e.id) * c.price, 0) as total_revenue,
    COALESCE(COUNT(DISTINCT e.id) * c.price, 0) as completed_revenue,
    COALESCE(COUNT(DISTINCT e.id) * ROUND(c.price * 0.20, 2), 0) as admin_revenue,
    COALESCE(COUNT(DISTINCT e.id) * (c.price - ROUND(c.price * 0.20, 2)), 0) as instructor_revenue,
    COUNT(DISTINCT e.id) as completed_payments,
    0 as pending_payments
FROM users u
LEFT JOIN courses c ON u.id = c.instructor_id
LEFT JOIN enrollments e ON c.id = e.course_id
WHERE u.role = 'instructor'
GROUP BY u.id, u.name, c.id, c.title;

-- ============================================
-- QUIZ STATISTICS VIEW
-- ============================================
CREATE OR REPLACE VIEW quiz_statistics AS
SELECT 
    q.id as quiz_id,
    q.title as quiz_title,
    q.course_id,
    COUNT(DISTINCT qr.id) as total_submissions,
    AVG(qr.score) as average_score,
    MAX(qr.score) as highest_score,
    MIN(qr.score) as lowest_score,
    COUNT(DISTINCT qr.student_id) as unique_students,
    COUNT(CASE WHEN qr.score >= 80 THEN 1 END) as passed_count,
    COUNT(CASE WHEN qr.score < 80 THEN 1 END) as failed_count
FROM quizzes q
LEFT JOIN quiz_results qr ON q.id = qr.quiz_id
GROUP BY q.id, q.title, q.course_id;

-- ============================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================

-- Add phone to users if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Add provider and provider_id for OAuth (Google, etc.)
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'local';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);

-- Add reset token for password reset
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

-- Add thumbnail and description to quizzes
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500);
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 80;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS time_limit INTEGER; -- in minutes

-- Add indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_course ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    due_date TIMESTAMP NOT NULL,
    points INTEGER NOT NULL DEFAULT 100 CHECK (points > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);

CREATE TABLE IF NOT EXISTS assignment_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    file_url TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    grade INTEGER CHECK (grade >= 0 AND grade <= 100),
    feedback TEXT,
    graded_at TIMESTAMP,
    UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student
    ON assignment_submissions(student_id);

-- ============================================
-- LEARNING PATHS ARE CREATED DYNAMICALLY BY INSTRUCTORS/ADMINS
-- ============================================

-- ============================================
-- SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial appearance settings
INSERT INTO settings (key, value) VALUES 
('appearance', '{"primaryColor": "#fbbf24", "logo": "", "fontFamily": "Inter"}'),
('features', '{"payments_enabled": true, "certificates_enabled": true, "quizzes_enabled": true, "discussions_enabled": true, "max_file_size": 5242880, "allowed_file_types": ["image/jpeg", "image/png", "image/gif", "image/webp"]}')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE bookmarks IS 'User bookmarked courses for quick access';
COMMENT ON TABLE notifications IS 'User notifications for various platform events';
COMMENT ON TABLE course_notes IS 'Personal notes taken by users on courses/lessons';
COMMENT ON TABLE announcements IS 'Instructor announcements for courses';
COMMENT ON TABLE learning_paths IS 'Curated learning paths with ordered courses';
COMMENT ON TABLE learning_path_courses IS 'Junction table linking paths to courses';
COMMENT ON TABLE user_learning_paths IS 'Track user progress through learning paths';
COMMENT ON VIEW leaderboard IS 'Student leaderboard based on activity and achievements';
COMMENT ON VIEW instructor_revenue IS 'Revenue tracking for instructors';
COMMENT ON VIEW quiz_statistics IS 'Statistical overview of quiz performance';
COMMENT ON TABLE settings IS 'Global platform settings (appearance, features, etc.)';
