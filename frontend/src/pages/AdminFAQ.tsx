/**
 * Super-admin: edit landing page FAQ (stored in settings.faq).
 */
import React, { useEffect, useState } from "react";
import { adminAPI, type FaqItem } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { HelpCircle, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `faq-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const AdminFAQ: React.FC = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<FaqItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await adminAPI.getSettings();
        const list = Array.isArray(data?.faq) ? data.faq : [];
        setItems(
          list.length
            ? list.map((x: FaqItem) => ({
                id: x.id || newId(),
                question:
                  x.question ||
                  x.questionSm ||
                  x.questionSomali ||
                  x.question_sm ||
                  "",
                answer:
                  x.answer || x.answerSm || x.answerSomali || x.answer_sm || "",
              }))
            : [
                {
                  id: newId(),
                  question: "",
                  answer: "",
                },
              ],
        );
      } catch {
        setItems([
          {
            id: newId(),
            question: "",
            answer: "",
          },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addRow = () => {
    setItems((prev) => [...prev, { id: newId(), question: "", answer: "" }]);
  };

  const removeRow = (id: string) => {
    setItems((prev) =>
      prev.length <= 1 ? prev : prev.filter((x) => x.id !== id),
    );
  };

  const updateRow = (id: string, field: keyof FaqItem, value: string) => {
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)),
    );
  };

  const handleSave = async () => {
    const cleaned = items.filter((x) => x.question.trim() || x.answer.trim());
    const incomplete = cleaned.find(
      (x) => !x.question.trim() || !x.answer.trim(),
    );
    if (incomplete) {
      toast({
        title: t("faq.incompleteTitle"),
        description: t("faq.incompleteDescription"),
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await adminAPI.updateSettings({ faq: cleaned });
      setItems(
        cleaned.length
          ? cleaned
          : [
              {
                id: newId(),
                question: "",
                answer: "",
              },
            ],
      );
      toast({
        title: t("faq.saved"),
        description: t("faq.savedDescription"),
      });
    } catch (e: unknown) {
      toast({
        title: t("faq.saveFailed"),
        description:
          e instanceof Error ? e.message : t("faq.saveFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl font-bold text-foreground">
            <HelpCircle size={24} className="text-accent" /> {t("faq.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("faq.description")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={addRow}>
            <Plus size={16} className="mr-1.5" /> {t("faq.addQuestion")}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="gradient-accent text-accent-foreground"
          >
            {saving ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            {saving ? t("profile.saving") : t("common.save")}
          </Button>
        </div>
      </motion.div>

      <div className="space-y-4">
        {items.map((row, index) => (
          <motion.div
            key={row.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Card className="border-border/60 shadow-card">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Item {index + 1}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeRow(row.id)}
                    aria-label={t("common.delete")}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`q-${row.id}`}>{t("faq.question")}</Label>
                  <Input
                    id={`q-${row.id}`}
                    value={row.question}
                    onChange={(e) =>
                      updateRow(row.id, "question", e.target.value)
                    }
                    placeholder={t("faq.questionPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`a-${row.id}`}>{t("faq.answer")}</Label>
                  <Textarea
                    id={`a-${row.id}`}
                    value={row.answer}
                    onChange={(e) =>
                      updateRow(row.id, "answer", e.target.value)
                    }
                    placeholder={t("faq.answerPlaceholder")}
                    rows={4}
                    className="resize-y min-h-[88px]"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminFAQ;
