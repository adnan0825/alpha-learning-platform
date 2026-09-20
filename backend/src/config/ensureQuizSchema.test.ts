import test from "node:test";
import assert from "node:assert/strict";

import { ensureQuizStatusColumn } from "./ensureQuizSchema";
import { pool } from "./db";

test("ensureQuizStatusColumn adds quizzes.is_active when missing", async () => {
  const originalQuery = pool.query;
  const calls: string[] = [];

  (pool as any).query = async (sql: string) => {
    calls.push(sql.trim());
    return { rows: [], rowCount: 0 };
  };

  try {
    await ensureQuizStatusColumn();
  } finally {
    (pool as any).query = originalQuery;
  }

  assert.deepEqual(calls, [
    `ALTER TABLE quizzes
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;`,
  ]);
});
