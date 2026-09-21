import test from "node:test";
import assert from "node:assert/strict";
import { buildPublicUrl, isAllowedCorsOrigin } from "./runtime";

const baseEnv = { ...process.env };

test("allows configured cloud-fronted and pages production origins", () => {
  process.env.CORS_ORIGINS = "https://alpha.online,https://www.alpha.online";

  try {
    assert.equal(isAllowedCorsOrigin("https://alpha.online"), true);
    assert.equal(isAllowedCorsOrigin("https://www.alpha.online"), true);
    assert.equal(isAllowedCorsOrigin("https://app.example.com"), false);
    assert.equal(isAllowedCorsOrigin("https://demo.pages.dev"), true);
  } finally {
    process.env = { ...baseEnv };
  }
});

test("builds public URLs from the configured backend origin", () => {
  process.env.PUBLIC_BASE_URL = "https://api.alpha.online";

  try {
    assert.equal(
      buildPublicUrl("/uploads/example.png"),
      "https://api.alpha.online/uploads/example.png",
    );
    assert.equal(
      buildPublicUrl("https://cdn.example.com/file.png"),
      "https://cdn.example.com/file.png",
    );
  } finally {
    process.env = { ...baseEnv };
  }
});
