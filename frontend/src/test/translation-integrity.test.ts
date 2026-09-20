import { describe, expect, it } from "vitest";
import { defaultTranslations } from "@/lib/defaultTranslations";

describe("translation dictionary integrity", () => {
  it("includes the admin user update description key", () => {
    expect(defaultTranslations["admin.users.updatedDescription"]).toBeDefined();
    expect(defaultTranslations["admin.users.updatedDescription"].en).not.toBe(
      "",
    );
    expect(defaultTranslations["admin.users.updatedDescription"].sm).not.toBe(
      "",
    );
  });

  it("has non-empty English and Somali values for every key", () => {
    for (const [key, value] of Object.entries(defaultTranslations)) {
      expect(value.en.trim(), `${key} English value`).not.toBe("");
      expect(value.sm.trim(), `${key} Somali value`).not.toBe("");
    }
  });

  it("uses matching interpolation placeholders in both locales", () => {
    const placeholders = (value: string) =>
      [...value.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();

    for (const [key, value] of Object.entries(defaultTranslations)) {
      expect(placeholders(value.sm), `${key} placeholders`).toEqual(
        placeholders(value.en),
      );
    }
  });
});
