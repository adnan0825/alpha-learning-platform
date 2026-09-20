import { pool } from "./db";

export async function ensureQuizStatusColumn() {
  await pool.query(`
    ALTER TABLE quizzes
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
  `);
}
