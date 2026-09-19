/**
 * LanguageContext - Bilingual support for Somali (sm) and English (en).
 * Strings default from bundled `defaultTranslations`; admin can override via API (settings `ui_translations`).
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { TranslationKey } from "@/lib/defaultTranslations";
import {
  mergeTranslationLayers,
  type TranslationMap,
} from "@/lib/mergeTranslations";
import { settingsAPI } from "@/lib/api";

export type Lang = "en" | "sm";

export const ALPHA_TRANSLATIONS_UPDATED = "alpha-translations-updated";

/** Persisted UI language */
export const ALPHA_LANG_KEY = "alpha-lang";
const LEGACY_LANG_KEY = "sota-lang";
/** Set after first language choice (modal or header switcher) — hides first-visit modal */
export const ALPHA_LANG_PROMPT_SEEN_KEY = "alpha-lang-prompt-seen";
const LEGACY_LANG_PROMPT_SEEN_KEY = "sota-lang-prompt-seen";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (
    key: TranslationKey,
    variables?: Record<string, string | number>,
  ) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export type { TranslationKey };

const normalizeStoredLanguage = (value: string | null): Lang => {
  if (value === "en" || value === "sm") return value;
  if (value === "om") {
    if (typeof window !== "undefined") {
      localStorage.setItem(ALPHA_LANG_KEY, "sm");
    }
    return "sm";
  }
  return "en";
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const didMigratePrompt = useRef(false);
  if (typeof window !== "undefined" && !didMigratePrompt.current) {
    didMigratePrompt.current = true;
    const s =
      localStorage.getItem(ALPHA_LANG_KEY) ||
      localStorage.getItem(LEGACY_LANG_KEY);
    if (
      (s === "en" || s === "sm" || s === "om") &&
      !localStorage.getItem(ALPHA_LANG_PROMPT_SEEN_KEY) &&
      !localStorage.getItem(LEGACY_LANG_PROMPT_SEEN_KEY)
    ) {
      localStorage.setItem(ALPHA_LANG_PROMPT_SEEN_KEY, "1");
    }
  }

  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return normalizeStoredLanguage(
      localStorage.getItem(ALPHA_LANG_KEY) ||
        localStorage.getItem(LEGACY_LANG_KEY),
    );
  });

  const [translationMap, setTranslationMap] = useState<TranslationMap>(() =>
    mergeTranslationLayers(null),
  );

  const loadTranslations = useCallback(async () => {
    try {
      const { entries } = await settingsAPI.getTranslations();
      setTranslationMap(mergeTranslationLayers(entries));
    } catch {
      setTranslationMap(mergeTranslationLayers(null));
    }
  }, []);

  useEffect(() => {
    void loadTranslations();
  }, [loadTranslations]);

  useEffect(() => {
    const onUpdate = () => {
      void loadTranslations();
    };
    window.addEventListener(ALPHA_TRANSLATIONS_UPDATED, onUpdate);
    return () =>
      window.removeEventListener(ALPHA_TRANSLATIONS_UPDATED, onUpdate);
  }, [loadTranslations]);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem(ALPHA_LANG_KEY, newLang);
    localStorage.setItem(ALPHA_LANG_PROMPT_SEEN_KEY, "1");
  }, []);

  const t = useCallback(
    (
      key: TranslationKey,
      variables?: Record<string, string | number>,
    ): string => {
      const entry = translationMap[key];
      let value = entry?.[lang] || entry?.en || key;
      if (variables) {
        value = value.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
          String(variables[name] ?? `{{${name}}}`),
        );
      }
      return value;
    },
    [lang, translationMap],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
