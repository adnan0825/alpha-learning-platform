import test from "node:test";
import assert from "node:assert/strict";
import type { Request, Response, NextFunction } from "express";
import router from "./certificates";
import { pool } from "../config/db";

function getRouteHandler(path: string, method: "get" | "post") {
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

test("GET /student/:studentId rejects a different authenticated user", async () => {
  const originalQuery = (pool as any).query;
  const queryCalls: string[] = [];
  (pool as any).query = async (...args: any[]) => {
    queryCalls.push(args[0]);
    return { rows: [] };
  };

  try {
    const handler = getRouteHandler("/student/:studentId", "get");
    const req = {
      params: { studentId: "99" },
      user: { id: 1, role: "student" },
    } as unknown as Request;
    const res = createRes();

    await handler(req, res, () => undefined);

    assert.equal(res.statusCode, 403);
    assert.deepEqual((res as any).payload, { error: "Not authorized" });
    assert.equal(queryCalls.length, 0);
  } finally {
    (pool as any).query = originalQuery;
  }
});

test("GET /student/:studentId allows the owning student", async () => {
  const originalQuery = (pool as any).query;
  (pool as any).query = async (...args: any[]) => {
    assert.match(args[0], /FROM certificates/);
    return {
      rows: [
        {
          id: 1,
          student_id: 7,
          course_id: 3,
          issued_at: "2025-01-01T00:00:00.000Z",
          certificate_number: "SOTA-2025-00001",
          instructor_name: "Ada",
          student_name: "Test User",
          verification_url: "https://example.com/verify/SOTA-2025-00001",
          course_title: "Intro Course",
          course_thumbnail: null,
        },
      ],
    };
  };

  try {
    const handler = getRouteHandler("/student/:studentId", "get");
    const req = {
      params: { studentId: "7" },
      user: { id: 7, role: "student" },
    } as unknown as Request;
    const res = createRes();

    await handler(req, res, () => undefined);

    assert.equal(res.statusCode, 200);
    assert.equal(Array.isArray((res as any).payload), true);
    assert.equal((res as any).payload[0].studentId, "7");
  } finally {
    (pool as any).query = originalQuery;
  }
});
