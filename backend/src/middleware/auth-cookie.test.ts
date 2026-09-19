import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

const baseEnv = { ...process.env };

test("authenticate accepts a bearer token from an httpOnly cookie", async () => {
  process.env.JWT_SECRET = "test-secret-key-long-enough-for-jwt";

  try {
    const { authenticate } = await import("./auth");
    const token = jwt.sign(
      { id: 42, email: "student@example.com", role: "student" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    const req: any = {
      headers: {
        cookie: `alpha_token=${encodeURIComponent(token)}`,
      },
    };
    const res: any = {
      status(code: number) {
        this.code = code;
        return this;
      },
      json(payload: any) {
        this.payload = payload;
        return this;
      },
    };
    let nextCalled = false;

    authenticate(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.user?.id, 42);
    assert.equal(req.user?.role, "student");
  } finally {
    process.env = { ...baseEnv };
  }
});
