/**
 * Cross-platform database setup script.
 * Creates the 'alpha' database if it doesn't exist.
 * Works on Ubuntu/Linux and Windows.
 *
 * Usage: tsx scripts/db-setup.ts
 * Or from package.json: "db:setup": "tsx scripts/db-setup.ts"
 */

import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

// Configuration
const dbHost = process.env.DB_HOST || "127.0.0.1";
const dbPort = parseInt(process.env.DB_PORT || "5432", 10);
const dbUser = process.env.DB_USER || "alpha";
const dbPassword = process.env.DB_PASSWORD || "alpha_password";
const dbName = process.env.DB_NAME || "alpha";

// SQL identifier escaping (prevents injection)
function escapeIdentifier(id: string): string {
  return `"${id.replace(/"/g, '""')}"`;
}

async function main() {
  console.log("=== Alpha Database Setup ===\n");
  console.log("Configuration:");
  console.log(`  Host: ${dbHost}`);
  console.log(`  Port: ${dbPort}`);
  console.log(`  User: ${dbUser}`);
  console.log(`  Database: ${dbName}`);
  console.log("");

  // Step 1: Connect to PostgreSQL admin database
  console.log("Step 1: Connecting to PostgreSQL...");

  const adminPool = new Pool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: "postgres", // Connect to maintenance database first
    connectionTimeoutMillis: 10000,
  });

  let adminClient;
  try {
    adminClient = await adminPool.connect();
    console.log("✓ Connected to PostgreSQL\n");
  } catch (err) {
    console.error(
      "✗ Failed to connect to PostgreSQL.\n" +
        "Please ensure:\n" +
        `  • PostgreSQL is installed and running\n` +
        `  • PostgreSQL is listening on ${dbHost}:${dbPort}\n` +
        `  • The user "${dbUser}" exists and can connect\n` +
        `  • The password in .env is correct\n`,
    );
    console.error(
      "Error details:",
      err instanceof Error ? err.message : String(err),
    );
    process.exit(1);
  }

  try {
    // Step 2: Check if database exists
    console.log(`Step 2: Checking if database "${dbName}" exists...`);

    const result = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName],
    );

    if (result.rows.length > 0) {
      console.log(`✓ Database "${dbName}" already exists.\n`);
      console.log("Status: Setup complete. No action needed.");
      process.exit(0);
    }

    // Step 3: Create database
    console.log(`Step 3: Creating database "${dbName}"...`);

    try {
      // Use safe identifier escaping for database name
      const query = `CREATE DATABASE ${escapeIdentifier(dbName)}`;
      await adminClient.query(query);
      console.log(`✓ Database "${dbName}" created successfully.\n`);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        // Race condition: database was created by another process
        console.log(
          `✓ Database "${dbName}" was created (by another process).\n`,
        );
      } else {
        throw err;
      }
    }

    console.log("Status: Database setup complete.\n");
    console.log("Next steps:");
    console.log("  1. npm run db:schema   (create tables and schema)");
    console.log("  2. npm run db:seed     (add initial data)");
    console.log("  3. npm run dev         (start backend server)");

    process.exit(0);
  } catch (err) {
    console.error("\n✗ Database setup failed:");
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  } finally {
    adminClient?.release();
    await adminPool.end();
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
