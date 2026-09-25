import test from "node:test";
import assert from "node:assert/strict";

import { isAllowedReceiptFileUrl } from "./manualPayments";

test("accepts receipt URLs from configured public storage domains", () => {
  const previous = {
    API_URL: process.env.API_URL,
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL,
    APP_PUBLIC_URL: process.env.APP_PUBLIC_URL,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    R2_CUSTOM_DOMAIN: process.env.R2_CUSTOM_DOMAIN,
  };

  try {
    process.env.API_URL = "https://api.example.com/api";
    process.env.PUBLIC_BASE_URL = "https://app.example.com";
    delete process.env.APP_PUBLIC_URL;
    process.env.R2_PUBLIC_URL = "https://cdn.example.com";
    delete process.env.R2_CUSTOM_DOMAIN;

    assert.equal(
      isAllowedReceiptFileUrl("https://cdn.example.com/uploads/receipt.png"),
      true,
    );
    assert.equal(
      isAllowedReceiptFileUrl("https://app.example.com/uploads/receipt.png"),
      true,
    );
  } finally {
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
});
