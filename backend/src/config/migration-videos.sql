-- Migration: application-managed video metadata
-- Safe to re-run. Existing course, lesson, and upload references are preserved.

CREATE TABLE IF NOT EXISTS media (
    id SERIAL PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    storage_key VARCHAR(255) UNIQUE NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    media_type VARCHAR(32) NOT NULL CHECK (media_type IN ('video')),
    visibility VARCHAR(16) NOT NULL DEFAULT 'protected' CHECK (visibility IN ('public', 'protected')),
    status VARCHAR(32) NOT NULL DEFAULT 'ready' CHECK (status IN ('uploading', 'ready', 'failed', 'deleted')),
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE media ADD COLUMN IF NOT EXISTS visibility VARCHAR(16) NOT NULL DEFAULT 'protected';

CREATE INDEX IF NOT EXISTS idx_media_created_by ON media(created_by);
CREATE INDEX IF NOT EXISTS idx_media_status ON media(status);
