/**
 * Student Help & Support Center
 */
import React, { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import {
  HelpCircle,
  Search,
  MessageCircle,
  Mail,
  ChevronDown,
  ChevronUp,
  Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const HelpCenter: React.FC = () => {
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();

  const faqs = [
    {
      q: t("help.faq.q1"),
      a: t("help.faq.a1"),
    },
    {
      q: t("help.faq.q2"),
      a: t("help.faq.a2"),
    },
    {
      q: t("help.faq.q3"),
      a: t("help.faq.a3"),
    },
    {
      q: t("help.faq.q4"),
      a: t("help.faq.a4"),
    },
    {
      q: t("help.faq.q5"),
      a: t("help.faq.a5"),
    },
    {
      q: t("help.faq.q6"),
      a: t("help.faq.a6"),
    },
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase()),
  );

  const sendMessage = () => {
    if (!message.trim()) return;
    toast({
      title: t("notify.success.messageSent"),
      description: "We'll get back to you within 24 hours.",
    });
    setMessage("");
  };

  return (
    <>
      <div className="space-y-8 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <HelpCircle size={24} className="text-accent" /> {t("help.title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("help.subtitle")}</p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder={t("help.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 border-border/60 bg-card/90 pl-9 backdrop-blur-sm dark:border-border/45 dark:bg-card/70"
          />
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="surface-dashboard-card shadow-elevated">
            <CardContent className="p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">
                {t("help.faqTitle")}
              </h3>
              <div className="space-y-2">
                {filteredFaqs.map((faq, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-xl border border-border/55 dark:border-border/40"
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/40 dark:hover:bg-muted/20"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {faq.q}
                      </span>
                      {openFaq === i ? (
                        <ChevronUp
                          size={16}
                          className="text-muted-foreground shrink-0"
                        />
                      ) : (
                        <ChevronDown
                          size={16}
                          className="text-muted-foreground shrink-0"
                        />
                      )}
                    </button>
                    {openFaq === i && (
                      <div className="px-4 pb-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {faq.a}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="surface-dashboard-card shadow-elevated">
            <CardContent className="space-y-4 p-6">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                <MessageCircle size={18} className="text-accent" /> Contact
                Support
              </h3>
              <p className="text-sm text-muted-foreground">
                Can't find what you're looking for? Send us a message.
              </p>
              <Textarea
                placeholder="Describe your issue..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px] border-border/60 bg-muted/35 dark:border-border/45 dark:bg-muted/25"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail size={12} /> info@alpha.online
                </div>
                <Button
                  onClick={sendMessage}
                  className="gradient-accent text-accent-foreground hover:opacity-90"
                >
                  <Send size={14} className="mr-1.5" /> Send Message
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default HelpCenter;
