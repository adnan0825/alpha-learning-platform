-- Migration: server-validated video watch progress
-- Stores resumable watch state separately from the client-controlled completion list.

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
