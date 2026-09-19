import test from "node:test";
import assert from "node:assert/strict";

const baseEnv = { ...process.env };

test("throws in production when JWT_SECRET is missing", () => {
  process.env.NODE_ENV = "production";
  delete process.env.JWT_SECRET;

  try {
    const { assertRequiredEnvironment } = require("./env");
    assert.throws(() => assertRequiredEnvironment(), /JWT_SECRET/i);
  } finally {
    process.env = { ...baseEnv };
  }
});

test("accepts a strong JWT_SECRET in development", () => {
  process.env.NODE_ENV = "development";
  process.env.JWT_SECRET = "development-secret-key-32chars-long";

  try {
    const { assertRequiredEnvironment } = require("./env");
    assert.doesNotThrow(() => assertRequiredEnvironment());
  } finally {
    process.env = { ...baseEnv };
  }
});
