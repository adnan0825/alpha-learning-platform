/**
 * Apply only schema-extensions.sql (settings, discussions, payments, certificates).
 * Use when base schema.sql was already applied and you only need missing tables.
 */
import fs from "fs";
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

async function main() {
  const filePath = resolveSqlFile("schema-extensions.sql");
  const sql = fs.readFileSync(filePath, "utf8");
  const statements = splitStatements(sql);
  const client = await pool.connect();
  try {
    for (const stmt of statements) {
      await client.query(stmt);
    }
    console.log(`Applied ${statements.length} statements from schema-extensions.sql`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
