import { render, act } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { ALPHA_LANG_KEY, LanguageProvider } from "@/contexts/LanguageContext";
import { mergeTranslationLayers } from "@/lib/mergeTranslations";

describe("language locale migration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("prefers the Somali locale code sm in the merged translations", () => {
    const map = mergeTranslationLayers({
      "nav.home": { en: "Home", sm: "Bogga Hore" },
    });

    expect(map["nav.home"].sm).toBe("Bogga Hore");
    expect(map["nav.home"].en).toBe("Home");
  });

  it("migrates saved om values to sm on startup", () => {
    window.localStorage.setItem(ALPHA_LANG_KEY, "om");

    act(() => {
      render(
        <LanguageProvider>
          <div>test</div>
        </LanguageProvider>,
      );
    });

    expect(window.localStorage.getItem(ALPHA_LANG_KEY)).toBe("sm");
  });
});
