-- Migration: extend certificates table with self-contained fields
-- Safe to re-run (uses IF NOT EXISTS)

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS instructor_name TEXT,
  ADD COLUMN IF NOT EXISTS student_name    TEXT,
  ADD COLUMN IF NOT EXISTS verification_url TEXT;
