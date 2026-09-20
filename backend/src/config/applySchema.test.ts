import test from "node:test";
import assert from "node:assert/strict";

import { splitStatements } from "./applySchema";

test("splitStatements keeps dollar-quoted function bodies intact", () => {
  const sql = `
    CREATE OR REPLACE FUNCTION enforce_first_user_admin_role()
    RETURNS TRIGGER AS $$
    BEGIN
        IF (SELECT COUNT(*) FROM users) = 0 THEN
            NEW.role := 'admin';
        ELSE
            NEW.role := 'student';
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY
    );
  `;

  const statements = splitStatements(sql);

  assert.equal(statements.length, 2);
  assert.match(
    statements[0],
    /CREATE OR REPLACE FUNCTION enforce_first_user_admin_role\(\)/,
  );
  assert.match(statements[1], /CREATE TABLE IF NOT EXISTS courses/);
});
