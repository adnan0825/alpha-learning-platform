-- If saving intro video fails with missing intro_video_url:
--   psql "$DATABASE_URL" -f scripts/add-intro-video-columns.sql

ALTER TABLE courses ADD COLUMN IF NOT EXISTS intro_video_url VARCHAR(2000);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS intro_video_title VARCHAR(255);
