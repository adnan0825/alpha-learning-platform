import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("landing page performance hints", () => {
  it("preloads the LCP logo before the app script executes", () => {
    const html = readFileSync(join(__dirname, "../../index.html"), "utf8");

    expect(html).toContain('rel="preload"');
    expect(html).toContain('as="image"');
    expect(html).toContain('href="/logo.png"');
    expect(html).toContain('fetchpriority="high"');
  });
});
