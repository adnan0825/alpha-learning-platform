/**
 * Apply schema.sql then schema-extensions.sql (settings, discussions, payments, certificates).
 * Uses DB_* from .env (same as the API).
 */
import fs from "fs";
import type { PoolClient } from "pg";
import dotenv from "dotenv";
import { pool } from "./db";
import { resolveSqlFile } from "./resolveSqlPath";

dotenv.config();

function splitStatements(sql: string): string[] {
  const noLineComments = sql.replace(/--[^\n]*/g, "");
  return noLineComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const skipIfAlreadyExists = (err: unknown): boolean => {
  const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: string }).code) : "";
  // 42P07 duplicate_table, 42710 duplicate_object (e.g. duplicate index name)
  return code === "42P07" || code === "42710";
};

async function runSqlFile(client: PoolClient, fileName: string): Promise<number> {
  const filePath = resolveSqlFile(fileName);
  const sql = fs.readFileSync(filePath, "utf8");
  const statements = splitStatements(sql);
  for (const stmt of statements) {
    try {
      await client.query(stmt);
    } catch (err) {
      if (skipIfAlreadyExists(err)) continue;
      throw err;
    }
  }
  return statements.length;
}

async function main() {
  const client = await pool.connect();
  try {
    const n1 = await runSqlFile(client, "schema.sql");
    console.log(`Applied ${n1} statements from schema.sql`);
    const n2 = await runSqlFile(client, "schema-extensions.sql");
    console.log(`Applied ${n2} statements from schema-extensions.sql`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
