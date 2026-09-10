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
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'course', 'quiz', 'certificate')),
    read BOOLEAN DEFAULT false,
    link VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

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
    COUNT(DISTINCT e.course_id) as courses_enrolled,
    COUNT(DISTINCT CASE WHEN p.completed THEN e.course_id END) as courses_completed,
    COUNT(DISTINCT p.lesson_id) as lessons_completed,
    COUNT(DISTINCT c.id) as certificates_earned,
    AVG(r.rating) as average_rating,
    COUNT(DISTINCT r.id) as reviews_given
FROM users u
LEFT JOIN enrollments e ON u.id = e.user_id
LEFT JOIN progress p ON u.id = p.user_id AND p.completed = true
LEFT JOIN certificates c ON u.id = c.student_id
LEFT JOIN reviews r ON u.id = r.user_id
WHERE u.role = 'student'
GROUP BY u.id, u.name, u.email, u.avatar
ORDER BY courses_completed DESC, lessons_completed DESC, certificates_earned DESC;

-- ============================================
-- REVENUE VIEW (For Instructor Revenue Tracking)
-- ============================================
CREATE OR REPLACE VIEW instructor_revenue AS
SELECT 
    u.id as instructor_id,
    u.name as instructor_name,
    c.id as course_id,
    c.title as course_title,
    COUNT(DISTINCT e.id) as total_enrollments,
    COALESCE(SUM(pmt.amount), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN pmt.status = 'completed' THEN pmt.amount ELSE 0 END), 0) as completed_revenue,
    COUNT(CASE WHEN pmt.status = 'completed' THEN 1 END) as completed_payments,
    COUNT(CASE WHEN pmt.status = 'pending' THEN 1 END) as pending_payments
FROM users u
LEFT JOIN courses c ON u.id = c.instructor_id
LEFT JOIN enrollments e ON c.id = e.course_id
LEFT JOIN payments pmt ON e.id = pmt.course_id AND pmt.user_id = e.user_id
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

-- ============================================
-- SEED DATA FOR LEARNING PATHS
-- ============================================
INSERT INTO learning_paths (title, description, created_by, is_active) VALUES
('Full Stack Web Development', 'Complete path from beginner to full stack developer', 1, true),
('Data Science & Machine Learning', 'Learn Python, data analysis, and ML fundamentals', 1, true),
('UI/UX Design Master', 'Master design principles, Figma, and user experience', 1, true)
ON CONFLICT DO NOTHING;

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
