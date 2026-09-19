-- Migration to add missing columns to courses and enrollments tables
-- Run this if you already have a database with the old schema

ALTER TABLE courses ADD COLUMN IF NOT EXISTS video_links JSONB DEFAULT '[]';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS total_videos INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration VARCHAR(50) DEFAULT '';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS enrolled_count INTEGER DEFAULT 0;

-- Add progress tracking columns to enrollments table
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS completed_videos JSONB DEFAULT '[]';
UPDATE enrollments SET progress = GREATEST(0, LEAST(100, COALESCE(progress, 0))) WHERE progress IS NULL OR progress < 0 OR progress > 100;
UPDATE enrollments SET completed_videos = '[]'::jsonb WHERE completed_videos IS NULL;
ALTER TABLE enrollments ALTER COLUMN progress SET DEFAULT 0;
ALTER TABLE enrollments ALTER COLUMN completed_videos SET DEFAULT '[]'::jsonb;
