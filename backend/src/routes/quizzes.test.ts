import test from "node:test";
import assert from "node:assert/strict";
import type { Request, Response, NextFunction } from "express";
import router from "./quizzes";
import { pool } from "../config/db";

function getRouteHandler(
  path: string,
  method: "get" | "post" | "put" | "patch" | "delete",
) {
  const layer = router.stack.find(
    (entry: any) =>
      entry.route &&
      entry.route.path === path &&
      Boolean(entry.route.methods[method]),
  );

  if (!layer || !layer.route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  return layer.route.stack[layer.route.stack.length - 1].handle as (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<void>;
}

function createRes() {
  return {
    statusCode: 200,
    payload: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.payload = payload;
      return this;
    },
  } as any;
}

test("PUT /quizzes/:id updates an owned quiz", async () => {
  const originalQuery = (pool as any).query;

  (pool as any).query = async (...args: any[]) => {
    const sql = String(args[0]);
    if (sql.includes("SELECT course_id FROM quizzes")) {
      return { rows: [{ course_id: 7 }] };
    }
    if (sql.includes("SELECT instructor_id FROM courses")) {
      return { rows: [{ instructor_id: 9 }] };
    }
    if (sql.includes("UPDATE quizzes")) {
      return {
        rows: [
          {
            id: 4,
            course_id: 7,
            title: "Updated quiz",
            questions: [
              { id: "1", question: "Q", options: ["A"], correctIndex: 0 },
            ],
          },
        ],
      };
    }
    return { rows: [], rowCount: 0 };
  };

  try {
    const handler = getRouteHandler("/:id", "put");
    const req = {
      params: { id: "4" },
      body: {
        title: "Updated quiz",
        questions: [
          { id: "1", question: "Q", options: ["A"], correctIndex: 0 },
        ],
      },
      user: { id: 9, role: "instructor" },
    } as unknown as Request;
    const res = createRes();

    await handler(req, res, () => undefined);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.title, "Updated quiz");
  } finally {
    (pool as any).query = originalQuery;
  }
});

test("PATCH /quizzes/:id/status deactivates an owned quiz", async () => {
  const originalQuery = (pool as any).query;

  (pool as any).query = async (...args: any[]) => {
    const sql = String(args[0]);
    if (sql.includes("SELECT course_id FROM quizzes")) {
      return { rows: [{ course_id: 7 }] };
    }
    if (sql.includes("SELECT instructor_id FROM courses")) {
      return { rows: [{ instructor_id: 9 }] };
    }
    if (sql.includes("UPDATE quizzes SET is_active =")) {
      return {
        rowCount: 1,
        rows: [
          {
            id: 4,
            course_id: 7,
            title: "Inactive quiz",
            questions: [
              { id: "1", question: "Q", options: ["A"], correctIndex: 0 },
            ],
            is_active: false,
            created_at: new Date().toISOString(),
          },
        ],
      };
    }
    return { rows: [], rowCount: 0 };
  };

  try {
    const handler = getRouteHandler("/:id/status", "patch");
    const req = {
      params: { id: "4" },
      body: { isActive: false },
      user: { id: 9, role: "instructor" },
    } as unknown as Request;
    const res = createRes();

    await handler(req, res, () => undefined);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.isActive, false);
  } finally {
    (pool as any).query = originalQuery;
  }
});
