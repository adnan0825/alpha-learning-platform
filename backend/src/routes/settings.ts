import { Router, Response } from "express";
import { authenticate, AuthRequest, requireAdmin } from "../middleware/auth";
import { query } from "../config/db";

const router = Router();

const defaultAppearance = {
  primaryColor: "#fbbf24",
  logo: "",
  fontFamily: "Inter",
  heroIntroVideoUrl: "",
};

function asPlainObject(value: unknown): Record<string, unknown> {
  if (value == null) return {};
  if (typeof value === "object" && !Array.isArray(value))
    return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const p = JSON.parse(value) as unknown;
      if (typeof p === "object" && p !== null && !Array.isArray(p))
        return p as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }
  return {};
}

// GET /api/settings/appearance - Publicly accessible appearance settings
router.get("/appearance", async (req, res: Response) => {
  try {
    const result = await query("SELECT value FROM settings WHERE key = $1", [
      "appearance",
    ]);
    const raw =
      result.rows.length > 0 ? asPlainObject(result.rows[0].value) : {};
    const appearance = { ...defaultAppearance, ...raw };
    res.json(appearance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

function normalizeFaqValue(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return normalizeFaqValue(parsed);
    } catch {
      return [];
    }
  }
  if (typeof raw === "object" && raw !== null && "items" in raw) {
    const inner = (raw as { items: unknown }).items;
    return Array.isArray(inner) ? inner : [];
  }
  return [];
}

// GET /api/settings/faq - Public FAQ items for landing page
router.get("/faq", async (req, res: Response) => {
  try {
    const result = await query("SELECT value FROM settings WHERE key = $1", [
      "faq",
    ]);
    const value = result.rows[0]?.value;
    const items = normalizeFaqValue(value);
    res.json({ items });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/settings/translations - Public: UI string overrides (merged with bundled defaults on the client)
router.get("/translations", async (_req, res: Response) => {
  try {
    const result = await query("SELECT value FROM settings WHERE key = $1", [
      "ui_translations",
    ]);
    const entries = asPlainObject(result.rows[0]?.value);
    res.json({ entries });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/settings/translations - Admin: full map of translation keys → { en, om }
router.put(
  "/translations",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { entries } = req.body as { entries?: unknown };
      if (
        entries == null ||
        typeof entries !== "object" ||
        Array.isArray(entries)
      ) {
        return res
          .status(400)
          .json({ error: 'Body must include object "entries"' });
      }
      const json = JSON.stringify(entries);
      if (json.length > 2_000_000) {
        return res
          .status(400)
          .json({ error: "Translations payload too large" });
      }
      await query(
        `
      INSERT INTO settings (key, value, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
    `,
        ["ui_translations", entries],
      );
      res.json({ message: "Translations updated successfully", entries });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// PUT /api/settings/appearance - Admin only update appearance
router.put(
  "/appearance",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const appearance = req.body;

      await query(
        `
      INSERT INTO settings (key, value, updated_at) 
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
    `,
        ["appearance", appearance],
      );

      res.json({
        message: "Appearance updated successfully",
        appearance,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
