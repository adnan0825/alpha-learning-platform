import {
  defaultTranslations,
  type TranslationKey,
} from "./defaultTranslations";

export type TranslationMap = {
  [K in TranslationKey]: { en: string; sm: string };
};

/** Merge bundled defaults with optional DB `entries` (empty / missing strings fall back to defaults). */
export function mergeTranslationLayers(
  stored:
    | Record<string, { en?: string; sm?: string; om?: string }>
    | null
    | undefined,
): TranslationMap {
  const keys = Object.keys(defaultTranslations) as TranslationKey[];
  const out = {} as TranslationMap;
  for (const key of keys) {
    const d = defaultTranslations[key];
    const s = stored?.[key];
    const en =
      s != null && typeof s.en === "string" && s.en.trim() !== "" ? s.en : d.en;
    const sm =
      s != null && typeof s.sm === "string" && s.sm.trim() !== ""
        ? s.sm
        : s != null && typeof s.om === "string" && s.om.trim() !== ""
          ? s.om
          : d.sm;
    out[key] = { en, sm };
  }
  return out;
}

export function translationMapToEntries(
  map: TranslationMap,
): Record<string, { en: string; sm: string }> {
  const keys = Object.keys(defaultTranslations) as TranslationKey[];
  const entries: Record<string, { en: string; sm: string }> = {};
  for (const key of keys) {
    entries[key] = { ...map[key] };
  }
  return entries;
}
