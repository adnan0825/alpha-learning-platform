import { pool } from './db';

/**
 * Creates manual_payment_receipts if missing and adds review workflow columns for existing DBs.
 */
export async function ensureManualPaymentReceiptsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS manual_payment_receipts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      receipt_image_url TEXT NOT NULL,
      amount_etb DECIMAL(12, 2),
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_manual_receipts_user ON manual_payment_receipts(user_id)`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_manual_receipts_course ON manual_payment_receipts(course_id)`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_manual_receipts_created ON manual_payment_receipts(created_at DESC)`
  );

  await pool.query(`
    ALTER TABLE manual_payment_receipts
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'pending'
  `);
  await pool.query(`
    ALTER TABLE manual_payment_receipts
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP
  `);
  await pool.query(`
    ALTER TABLE manual_payment_receipts
    ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
  `);
}
