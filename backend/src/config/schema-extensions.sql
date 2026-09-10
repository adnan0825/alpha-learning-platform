-- Extensions for API routes not covered by schema.sql.
-- Applied automatically after schema.sql (see applySchema.ts). Safe to re-run.

CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discussions (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_index INTEGER DEFAULT 0,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    parent_id INTEGER REFERENCES discussions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discussions_course ON discussions(course_id);
CREATE INDEX IF NOT EXISTS idx_discussions_user ON discussions(user_id);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    tx_ref VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'ETB',
    status VARCHAR(50) DEFAULT 'pending',
    meta JSONB DEFAULT '{}',
    chapa_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_course ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Screenshots / receipts after manual bank or wallet transfer (not Chapa)
CREATE TABLE IF NOT EXISTS manual_payment_receipts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    receipt_image_url TEXT NOT NULL,
    amount_etb DECIMAL(12, 2),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) DEFAULT 'pending',
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_manual_receipts_user ON manual_payment_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_receipts_course ON manual_payment_receipts(course_id);
CREATE INDEX IF NOT EXISTS idx_manual_receipts_created ON manual_payment_receipts(created_at DESC);

CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    UNIQUE(student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);

-- Notifications (user inbox; required by /api/analytics/notifications)
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

-- Logged-in user questions / feedback to admins (with optional admin reply)
CREATE TABLE IF NOT EXISTS user_feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    admin_reply TEXT,
    replied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created ON user_feedback(created_at DESC);

-- Quizzes (required by /api/quizzes/*)
CREATE TABLE IF NOT EXISTS quizzes (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quizzes_course ON quizzes(course_id);

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500);
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 80;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS time_limit INTEGER;

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

-- Public intro video (YouTube etc.) — free to watch; thumbnail remains for cards
ALTER TABLE courses ADD COLUMN IF NOT EXISTS intro_video_url VARCHAR(500);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS intro_video_title VARCHAR(255);
-- Long URLs (query strings); safe no-op if already wider
ALTER TABLE courses ALTER COLUMN intro_video_url TYPE VARCHAR(2000);

INSERT INTO settings (key, value) VALUES
('appearance', '{"primaryColor": "#fbbf24", "logo": "", "fontFamily": "Inter", "heroIntroVideoUrl": "https://youtu.be/WinAdWf4uH8"}'::jsonb),
('features', '{"payments_enabled": true, "certificates_enabled": true, "quizzes_enabled": true, "discussions_enabled": true, "max_file_size": 5242880, "allowed_file_types": ["image/jpeg", "image/png", "image/gif", "image/webp"]}'::jsonb),
('faq', '[
  {"id":"seed-1","question":"How do I enroll in a course?","answer":"Create an account, sign in, browse courses, then open a course and follow the enrollment steps."},
  {"id":"seed-2","question":"Are lessons available in multiple languages?","answer":"Yes. Alpha offers quality tech education in multiple languages."},
  {"id":"seed-3","question":"How do I contact support?","answer":"Use the email in the footer or the Help Center after you sign in."}
]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- EXTENDED CERTIFICATES (self-contained fields)
-- ============================================
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS instructor_name TEXT,
  ADD COLUMN IF NOT EXISTS student_name    TEXT,
  ADD COLUMN IF NOT EXISTS verification_url TEXT;

-- ============================================
-- BOOKMARKS
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
-- COURSE NOTES
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
-- ANNOUNCEMENTS
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
-- LEARNING PATHS
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
-- LEADERBOARD VIEW
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
-- INSTRUCTOR REVENUE VIEW
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
-- ADDITIONAL USER COLUMNS
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'local';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

-- ============================================
-- LEARNING PATHS SEED DATA
-- ============================================
INSERT INTO learning_paths (title, description, created_by, is_active) VALUES
('Full Stack Web Development', 'Complete path from beginner to full stack developer', 1, true),
('Data Science & Machine Learning', 'Learn Python, data analysis, and ML fundamentals', 1, true),
('UI/UX Design Master', 'Master design principles, Figma, and user experience', 1, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- DOCUMENTATION COMMENTS
-- ============================================
COMMENT ON TABLE bookmarks IS 'User bookmarked courses for quick access';
COMMENT ON TABLE course_notes IS 'Personal notes taken by users on courses/lessons';
COMMENT ON TABLE announcements IS 'Instructor announcements for courses';
COMMENT ON TABLE learning_paths IS 'Curated learning paths with ordered courses';
COMMENT ON TABLE learning_path_courses IS 'Junction table linking paths to courses';
COMMENT ON TABLE user_learning_paths IS 'Track user progress through learning paths';
COMMENT ON VIEW leaderboard IS 'Student leaderboard based on activity and achievements';
COMMENT ON VIEW instructor_revenue IS 'Revenue tracking for instructors';
COMMENT ON VIEW quiz_statistics IS 'Statistical overview of quiz performance';
