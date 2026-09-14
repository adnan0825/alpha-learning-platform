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

const faqs = [
  {
    q: "How do I enroll in a course?",
    a: "Browse courses from the sidebar, click on a course, and click the 'Enroll' button. You'll get instant access to all course materials.",
  },
  {
    q: "How do I get my certificate?",
    a: "Complete all video lessons and pass the course quiz with at least 70% score. Your certificate will be automatically generated and available in the Certificates page.",
  },
  {
    q: "Can I learn at my own pace?",
    a: "Yes! All courses are self-paced. You can pause, rewind, and revisit any lesson as many times as you want.",
  },
  {
    q: "What languages are courses available in?",
    a: "Most courses are taught in Somali with English subtitles. Some courses are available in both languages.",
  },
  {
    q: "How do I sign in?",
    a: "We use Google Sign-In. Use the same Google account each time; there is no separate platform password.",
  },
  {
    q: "Is there a mobile app?",
    a: "Not yet, but our website is fully mobile-responsive. You can access all courses from your phone's browser.",
  },
];

const HelpCenter: React.FC = () => {
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase()),
  );

  const sendMessage = () => {
    if (!message.trim()) return;
    toast({
      title: t("help.sent"),
      description: t("help.sentDescription"),
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
            placeholder={t("help.search")}
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
                <MessageCircle size={18} className="text-accent" />{" "}
                {t("help.contactTitle")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("help.contactDescription")}
              </p>
              <Textarea
                placeholder={t("help.issuePlaceholder")}
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
                  <Send size={14} className="mr-1.5" /> {t("help.send")}
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
