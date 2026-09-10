import {
  defaultTranslations,
  type TranslationKey,
} from "./defaultTranslations";

export type TranslationMap = {
  [K in TranslationKey]: { en: string; om: string };
};

/** Merge bundled defaults with optional DB `entries` (empty / missing strings fall back to defaults). */
export function mergeTranslationLayers(
  stored: Record<string, { en?: string; om?: string }> | null | undefined,
): TranslationMap {
  const keys = Object.keys(defaultTranslations) as TranslationKey[];
  const out = {} as TranslationMap;
  for (const key of keys) {
    const d = defaultTranslations[key];
    const s = stored?.[key];
    const en =
      s != null && typeof s.en === "string" && s.en.trim() !== "" ? s.en : d.en;
    const om =
      s != null && typeof s.om === "string" && s.om.trim() !== "" ? s.om : d.om;
    out[key] = { en, om };
  }
  return out;
}

export function translationMapToEntries(
  map: TranslationMap,
): Record<string, { en: string; om: string }> {
  const keys = Object.keys(defaultTranslations) as TranslationKey[];
  const entries: Record<string, { en: string; om: string }> = {};
  for (const key of keys) {
    entries[key] = { ...map[key] };
  }
  return entries;
}
