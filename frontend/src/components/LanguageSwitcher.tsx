/**
 * LanguageSwitcher — shows one language at a time (full name); click to switch.
 */
import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  /** High-contrast style for dark hero bands (e.g. login split layout). */
  variant?: "default" | "onDark";
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className,
  variant = "default",
}) => {
  const { lang, setLang, t } = useLanguage();
  const onDark = variant === "onDark";
  const other: "en" | "sm" = lang === "en" ? "sm" : "en";
  const currentLabel = t(
    lang === "en" ? "language.english" : "language.somali",
  );
  const otherLabel = t(other === "en" ? "language.english" : "language.somali");

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm backdrop-blur-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        onDark
          ? "border-white/25 bg-white/10 text-white hover:bg-white/20"
          : "border-border/60 bg-background/90 text-foreground hover:bg-muted/80 dark:border-border/45 dark:bg-background/50 dark:hover:bg-muted/30",
        className,
      )}
      onClick={() => setLang(other)}
      aria-label={`${t("language.switchTo")}: ${otherLabel}`}
      title={`${t("language.switchTo")}: ${otherLabel}`}
    >
      <Languages
        className={cn(
          "h-4 w-4 shrink-0 stroke-[2]",
          onDark ? "text-white" : "text-accent",
        )}
        aria-hidden
      />
      <span className="whitespace-nowrap">{currentLabel}</span>
    </button>
  );
};

export default LanguageSwitcher;
