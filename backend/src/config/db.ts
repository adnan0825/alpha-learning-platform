import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL?.trim();

/** Use DB_SSL=true for managed Postgres (Neon, RDS, etc.) or when the server requires TLS. */
const sslFromEnv =
  process.env.DB_SSL === "true" || process.env.DB_SSL === "1"
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" }
    : undefined;

export const pool = connectionString
  ? new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : new Pool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      user: process.env.DB_USER || "alpha",
      password: process.env.DB_PASSWORD || "alpha_password",
      database: process.env.DB_NAME || "alpha",
      ssl: sslFromEnv,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== "production") {
    console.log("Executed query", {
      text: text.substring(0, 50),
      duration,
      rows: res.rowCount,
    });
  }
  return res;
};
