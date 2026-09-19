import { pool } from "./db";
import * as fs from "fs";
import { resolveSqlFile } from "./resolveSqlPath";

const migrations = [
  "migration.sql",
  "migration-add-tables.sql",
  "migration-certificates.sql",
  "migration-videos.sql",
  "migration-video-progress.sql",
];

const runMigration = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const name of migrations) {
      const applied = await client.query(
        "SELECT 1 FROM schema_migrations WHERE name = $1",
        [name],
      );
      if (applied.rowCount) {
        console.log(`Migration skipped: ${name}`);
        continue;
      }

      const sql = fs.readFileSync(resolveSqlFile(name), "utf-8");
      console.log(`Running migration: ${name}`);
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
        name,
      ]);
    }

    await client.query("COMMIT");
    console.log("Database migrations completed successfully.");
    return;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Database migration failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

runMigration();
