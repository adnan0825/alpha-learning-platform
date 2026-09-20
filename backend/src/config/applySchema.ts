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

export function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let i = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inDollarQuote: string | null = null;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inSingleQuote) {
      current += ch;
      if (ch === "'" && next === "'") {
        current += next;
        i += 2;
        continue;
      }
      if (ch === "'") {
        inSingleQuote = false;
      }
      i += 1;
      continue;
    }

    if (inDoubleQuote) {
      current += ch;
      if (ch === '"' && next === '"') {
        current += next;
        i += 2;
        continue;
      }
      if (ch === '"') {
        inDoubleQuote = false;
      }
      i += 1;
      continue;
    }

    if (inDollarQuote) {
      if (sql.startsWith(inDollarQuote, i)) {
        current += inDollarQuote;
        i += inDollarQuote.length;
        inDollarQuote = null;
        continue;
      }
      current += ch;
      i += 1;
      continue;
    }

    if (ch === "-" && next === "-") {
      i += 2;
      while (i < sql.length && sql[i] !== "\n" && sql[i] !== "\r") {
        i += 1;
      }
      continue;
    }

    if (ch === "/" && next === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) {
        i += 1;
      }
      if (i < sql.length) {
        i += 2;
      }
      continue;
    }

    if (ch === "'") {
      inSingleQuote = true;
      current += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inDoubleQuote = true;
      current += ch;
      i += 1;
      continue;
    }

    if (ch === "$") {
      if (sql.startsWith("$$", i)) {
        current += "$$";
        inDollarQuote = "$$";
        i += 2;
        continue;
      }

      const tagMatch = sql.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$/);
      if (tagMatch) {
        const tag = tagMatch[0];
        current += tag;
        inDollarQuote = tag;
        i += tag.length;
        continue;
      }
    }

    if (ch === ";") {
      const statement = current.trim();
      if (statement.length > 0) {
        statements.push(statement);
      }
      current = "";
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  const tail = current.trim();
  if (tail.length > 0) {
    statements.push(tail);
  }

  return statements;
}

const skipIfAlreadyExists = (err: unknown): boolean => {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: string }).code)
      : "";
  // 42P07 duplicate_table, 42710 duplicate_object (e.g. duplicate index name)
  return code === "42P07" || code === "42710";
};

async function runSqlFile(
  client: PoolClient,
  fileName: string,
): Promise<number> {
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

async function cleanupSeedLearningPaths(client: PoolClient) {
  const staleTitles = [
    "Full Stack Web Development",
    "Data Science & Machine Learning",
    "UI/UX Design Master",
  ];
  const staleDescriptions = [
    "Complete path from beginner to full stack developer",
    "Learn Python, data analysis, and ML fundamentals",
    "Master design principles, Figma, and user experience",
  ];

  await client.query(
    `
      DELETE FROM learning_path_courses
      WHERE learning_path_id IN (
        SELECT id
        FROM learning_paths
        WHERE created_by = 1
          AND title = ANY($1::text[])
          AND description = ANY($2::text[])
      );
    `,
    [staleTitles, staleDescriptions],
  );

  await client.query(
    `
      DELETE FROM learning_paths
      WHERE created_by = 1
        AND title = ANY($1::text[])
        AND description = ANY($2::text[]);
    `,
    [staleTitles, staleDescriptions],
  );
}

async function main() {
  const client = await pool.connect();
  try {
    const n1 = await runSqlFile(client, "schema.sql");
    console.log(`Applied ${n1} statements from schema.sql`);
    const n2 = await runSqlFile(client, "schema-extensions.sql");
    console.log(`Applied ${n2} statements from schema-extensions.sql`);
    await cleanupSeedLearningPaths(client);
    console.log("Removed stale hardcoded learning path seed rows");
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
