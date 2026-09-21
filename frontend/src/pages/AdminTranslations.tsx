/**
 * Admin: edit all English / Somali UI strings (stored in settings.ui_translations).
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  defaultTranslations,
  type TranslationKey,
} from "@/lib/defaultTranslations";
import {
  mergeTranslationLayers,
  translationMapToEntries,
  type TranslationMap,
} from "@/lib/mergeTranslations";
import { settingsAPI } from "@/lib/api";
import { ALPHA_TRANSLATIONS_UPDATED } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { Languages, Loader2, RotateCcw, Save, Undo2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const sortedKeys = (Object.keys(defaultTranslations) as TranslationKey[]).sort(
  (a, b) => a.localeCompare(b),
);

type SavingState = false | "all" | TranslationKey;

const AdminTranslations: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<SavingState>(false);
  const [search, setSearch] = useState("");
  /** When true, filter also matches EN/SM — clearing text can hide the row while this matches. */
  const [searchInText, setSearchInText] = useState(false);
  const [form, setForm] = useState<TranslationMap | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { entries } = await settingsAPI.getTranslations();
        setForm(mergeTranslationLayers(entries));
      } catch {
        setForm(mergeTranslationLayers(null));
        toast({
          title: "Could not load saved translations",
          description:
            "Showing bundled defaults. Save will create server overrides.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const filteredKeys = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !form) return sortedKeys;
    return sortedKeys.filter((k) => {
      if (k.toLowerCase().includes(q)) return true;
      if (!searchInText) return false;
      const v = form[k];
      return v.en.toLowerCase().includes(q) || v.sm.toLowerCase().includes(q);
    });
  }, [search, searchInText, form]);

  const patch = (key: TranslationKey, field: "en" | "sm", value: string) => {
    setForm((prev) =>
      prev ? { ...prev, [key]: { ...prev[key], [field]: value } } : prev,
    );
  };

  const resetKey = (key: TranslationKey) => {
    setForm((prev) =>
      prev ? { ...prev, [key]: { ...defaultTranslations[key] } } : prev,
    );
  };

  const handleSaveRow = async (key: TranslationKey) => {
    if (!form) return;
    setSaving(key);
    try {
      const { entries: server } = await settingsAPI.getTranslations();
      const next: Record<string, { en: string; sm: string }> = {};
      if (server && typeof server === "object" && !Array.isArray(server)) {
        for (const [k, v] of Object.entries(
          server as Record<string, { en?: string; sm?: string; om?: string }>,
        )) {
          if (v && typeof v === "object") {
            next[k] = {
              en: typeof v.en === "string" ? v.en : "",
              sm:
                typeof v.sm === "string"
                  ? v.sm
                  : typeof v.om === "string"
                    ? v.om
                    : "",
            };
          }
        }
      }
      const v = form[key];
      const d = defaultTranslations[key];
      const matchesBundled =
        v.en.trim() === d.en.trim() && v.sm.trim() === d.sm.trim();
      if (matchesBundled) {
        delete next[key];
      } else {
        next[key] = { en: v.en, sm: v.sm };
      }
      await settingsAPI.updateTranslations(next);
      window.dispatchEvent(new Event(ALPHA_TRANSLATIONS_UPDATED));
      toast({
        title: "Saved",
        description: "The translation has been updated.",
      });
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description:
          e instanceof Error ? e.message : "Could not save this row.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving("all");
    try {
      await settingsAPI.updateTranslations(translationMapToEntries(form));
      window.dispatchEvent(new Event(ALPHA_TRANSLATIONS_UPDATED));
      toast({
        title: "All translations saved",
        description: "Visitors will see updates after the next page load.",
      });
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description:
          e instanceof Error ? e.message : "Could not save translations.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRevertFormToBundled = () => {
    setForm(mergeTranslationLayers(null));
    toast({
      title: "Form reset",
      description:
        "Values match bundled defaults. Save to apply on the server.",
    });
  };

  const handleClearServerOverrides = async () => {
    setSaving("all");
    try {
      await settingsAPI.updateTranslations(
        {} as Record<string, { en: string; sm: string }>,
      );
      setForm(mergeTranslationLayers(null));
      window.dispatchEvent(new Event(ALPHA_TRANSLATIONS_UPDATED));
      toast({
        title: "Server overrides cleared",
        description: "Site uses bundled defaults again.",
      });
    } catch (e: unknown) {
      toast({
        title: "Clear failed",
        description:
          e instanceof Error ? e.message : "Could not clear overrides.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const busy = saving !== false;

  if (loading || !form) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Languages size={24} className="text-accent" /> UI translations
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Use <strong className="text-foreground font-medium">Save</strong> on
            a row to publish that key only. Use{" "}
            <strong className="text-foreground font-medium">Save all</strong> to
            push every field in the form. Search by key or text.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRevertFormToBundled}
            disabled={busy}
          >
            <Undo2 size={16} className="mr-1.5" />
            Reset form to defaults
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearServerOverrides}
            disabled={busy}
          >
            <RotateCcw size={16} className="mr-1.5" />
            Clear server overrides
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="gradient-accent text-accent-foreground min-w-[120px]"
          >
            {saving === "all" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} className="mr-1.5" />
            )}
            {saving === "all" ? "Saving…" : "Save all"}
          </Button>
        </div>
      </motion.div>

      <Card className="shadow-card">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="space-y-2 max-w-md">
            <Label htmlFor="trans-search">Filter by translation key</Label>
            <Input
              id="trans-search"
              placeholder="e.g. nav.home, login., hero."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-start gap-2 max-w-md">
            <Checkbox
              id="trans-search-text"
              checked={searchInText}
              onCheckedChange={(c) => setSearchInText(c === true)}
            />
            <Label
              htmlFor="trans-search-text"
              className="text-xs font-normal leading-snug cursor-pointer text-muted-foreground"
            >
              Also match English / Somali text. If enabled, deleting characters
              can hide a row when it no longer contains your search words—clear
              the filter or turn this off.
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {filteredKeys.length} of {sortedKeys.length} keys
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filteredKeys.map((key) => (
          <Card key={key} className="shadow-card overflow-hidden">
            <CardContent className="p-3 sm:p-3.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3">
                <div className="flex sm:flex-col sm:justify-between gap-2 sm:w-[10.5rem] shrink-0 sm:min-w-0">
                  <code className="text-[11px] leading-snug font-mono text-accent break-all line-clamp-3 sm:line-clamp-none">
                    {key}
                  </code>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 px-2 text-[11px] shrink-0"
                      disabled={busy}
                      onClick={() => handleSaveRow(key)}
                    >
                      {saving === key ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <>
                          <Save size={12} className="mr-1" /> Save
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] shrink-0"
                      disabled={busy}
                      onClick={() => resetKey(key)}
                    >
                      <RotateCcw size={12} className="mr-1" /> Default
                    </Button>
                  </div>
                </div>
                <div className="grid flex-1 grid-cols-1 gap-2 min-w-0 sm:grid-cols-2">
                  <div className="space-y-1 min-w-0">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      English
                    </Label>
                    <Textarea
                      value={form[key].en}
                      onChange={(e) => patch(key, "en", e.target.value)}
                      rows={2}
                      className="min-h-[2.25rem] max-h-24 resize-y text-xs leading-snug py-1.5"
                    />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Somali
                    </Label>
                    <Textarea
                      value={form[key].sm}
                      onChange={(e) => patch(key, "sm", e.target.value)}
                      rows={2}
                      className="min-h-[2.25rem] max-h-24 resize-y text-xs leading-snug py-1.5"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminTranslations;
