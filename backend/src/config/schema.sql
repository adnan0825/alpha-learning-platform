-- Database Schema for Alpha Tech Academy (idempotent: safe to re-run)

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
    avatar VARCHAR(500),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION enforce_first_user_admin_role()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM users) = 0 THEN
        NEW.role := 'admin';
    ELSE
        NEW.role := 'student';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_first_user_admin_role_on_insert ON users;
CREATE TRIGGER enforce_first_user_admin_role_on_insert
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION enforce_first_user_admin_role();

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail VARCHAR(500),
    instructor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100),
    difficulty VARCHAR(50) DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    price DECIMAL(10, 2) DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    video_links JSONB DEFAULT '[]',
    total_videos INTEGER DEFAULT 0,
    duration VARCHAR(50) DEFAULT '',
    enrolled_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modules table (sections within a course)
CREATE TABLE IF NOT EXISTS modules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    video_url VARCHAR(500),
    duration INTEGER, -- in seconds
    position INTEGER DEFAULT 0,
    is_free BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    completed_videos JSONB NOT NULL DEFAULT '[]'::jsonb,
    UNIQUE(user_id, course_id)
);

-- Progress table (track lesson completion)
CREATE TABLE IF NOT EXISTS progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

-- Server-validated, resumable watch state for course video links.
CREATE TABLE IF NOT EXISTS video_watch_progress (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    video_index INTEGER NOT NULL CHECK (video_index >= 0),
    watched_seconds NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (watched_seconds >= 0),
    duration_seconds NUMERIC(10, 2) NOT NULL CHECK (duration_seconds > 0),
    last_position_seconds NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (last_position_seconds >= 0),
    completed BOOLEAN NOT NULL DEFAULT false,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (enrollment_id, video_index)
);

CREATE INDEX IF NOT EXISTS idx_video_watch_progress_enrollment
    ON video_watch_progress(enrollment_id);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson ON progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_reviews_course ON reviews(course_id);
