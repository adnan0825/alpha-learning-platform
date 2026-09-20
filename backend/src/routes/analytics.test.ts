import test from "node:test";
import assert from "node:assert/strict";
import type { Request, Response, NextFunction } from "express";
import router from "./analytics";
import { pool } from "../config/db";

function getRouteHandler(
  path: string,
  method: "get" | "post" | "put" | "delete",
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

test("GET /announcements/course/:courseId rejects a student who is not enrolled in the course", async () => {
  const originalQuery = (pool as any).query;

  (pool as any).query = async (...args: any[]) => {
    assert.match(String(args[0]), /FROM enrollments/);
    return { rowCount: 0, rows: [] };
  };

  try {
    const handler = getRouteHandler("/announcements/course/:courseId", "get");
    const req = {
      params: { courseId: "42" },
      user: { id: 10, role: "student" },
    } as unknown as Request;
    const res = createRes();

    await handler(req, res, () => undefined);

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.payload, { error: "Not authorized" });
  } finally {
    (pool as any).query = originalQuery;
  }
});

test("POST /announcements allows an instructor who owns the course", async () => {
  const originalQuery = (pool as any).query;

  (pool as any).query = async (...args: any[]) => {
    const sql = String(args[0]);
    if (sql.includes("FROM courses")) {
      return { rowCount: 1, rows: [{ id: 99 }] };
    }
    if (sql.includes("INSERT INTO announcements")) {
      return {
        rows: [
          {
            id: 1,
            instructor_id: 5,
            course_id: 99,
            title: "Hello",
            content: "World",
            is_pinned: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      };
    }
    return { rowCount: 0, rows: [] };
  };

  try {
    const handler = getRouteHandler("/announcements", "post");
    const req = {
      body: {
        courseId: "99",
        title: "Hello",
        content: "World",
        isPinned: false,
      },
      user: { id: 5, role: "instructor" },
    } as unknown as Request;
    const res = createRes();

    await handler(req, res, () => undefined);

    assert.equal(res.statusCode, 201);
    assert.equal(res.payload.title, "Hello");
  } finally {
    (pool as any).query = originalQuery;
  }
});

test("POST /learning-paths allows an instructor to create a path with their own courses", async () => {
  const originalQuery = (pool as any).query;

  (pool as any).query = async (...args: any[]) => {
    const sql = String(args[0]);
    if (sql.includes("SELECT id FROM courses WHERE id = ANY")) {
      return { rowCount: 2, rows: [{ id: 11 }, { id: 12 }] };
    }
    if (sql.includes("INSERT INTO learning_paths")) {
      return { rows: [{ id: 7, title: "Frontend Path", created_by: 5 }] };
    }
    if (sql.includes("INSERT INTO learning_path_courses")) {
      return { rows: [{ id: 1 }] };
    }
    return { rowCount: 0, rows: [] };
  };

  try {
    const handler = getRouteHandler("/learning-paths", "post");
    const req = {
      body: {
        title: "Frontend Path",
        description: "Learn UI and React",
        courseIds: [11, 12],
      },
      user: { id: 5, role: "instructor" },
    } as unknown as Request;
    const res = createRes();

    await handler(req, res, () => undefined);

    assert.equal(res.statusCode, 201);
    assert.equal(res.payload.title, "Frontend Path");
  } finally {
    (pool as any).query = originalQuery;
  }
});

test("GET /learning-paths/mine returns the instructor's recent learning paths", async () => {
  const originalQuery = (pool as any).query;

  (pool as any).query = async (...args: any[]) => {
    const sql = String(args[0]);
    if (sql.includes("FROM learning_paths lp")) {
      return {
        rows: [
          { id: 8, title: "Advanced React", created_by: 5, course_count: 2 },
        ],
      };
    }
    return { rowCount: 0, rows: [] };
  };

  try {
    const handler = getRouteHandler("/learning-paths/mine", "get");
    const req = {
      user: { id: 5, role: "instructor" },
    } as unknown as Request;
    const res = createRes();

    await handler(req, res, () => undefined);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload[0].title, "Advanced React");
  } finally {
    (pool as any).query = originalQuery;
  }
});

test("POST /user/learning-paths/:pathId rejects instructors from enrolling", async () => {
  const handler = getRouteHandler("/user/learning-paths/:pathId", "post");
  const req = {
    params: { pathId: "42" },
    user: { id: 5, role: "instructor" },
  } as unknown as Request;
  const res = createRes();

  await handler(req, res, () => undefined);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.payload, {
    error: "Not authorized - student access required",
  });
});
