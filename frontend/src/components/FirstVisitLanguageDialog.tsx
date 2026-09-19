/**
 * First visit: choose the default interface language while keeping English as the default language.
 */
import React, { useEffect, useState } from "react";
import {
  useLanguage,
  ALPHA_LANG_PROMPT_SEEN_KEY,
} from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const FirstVisitLanguageDialog: React.FC = () => {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(() =>
    typeof window !== "undefined"
      ? !localStorage.getItem(ALPHA_LANG_PROMPT_SEEN_KEY)
      : false,
  );

  useEffect(() => {
    if (localStorage.getItem(ALPHA_LANG_PROMPT_SEEN_KEY)) {
      setOpen(false);
    }
  }, [lang]);

  const choose = (next: "en" | "sm") => {
    setLang(next);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-[min(100%,20rem)] gap-3 border-border/60 p-5 shadow-xl sm:max-w-sm [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-2 text-center sm:text-center">
          <DialogTitle className="font-display text-lg leading-tight">
            {t("langModal.title")}
          </DialogTitle>
          <DialogDescription className="text-xs leading-snug">
            {t("langModal.subtitle")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-center border-border/70 font-medium"
            onClick={() => choose("en")}
          >
            {t("langModal.english")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-center border-border/70 font-medium"
            onClick={() => choose("sm")}
          >
            {t("langModal.afanOromo")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FirstVisitLanguageDialog;
