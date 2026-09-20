import { useState } from "react";
import { MessageCircle, Phone, Mail, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const TELEGRAM = "@alpha_contact_825";
const PHONE = "+251978261753";
const PHONE_LABEL = "+251 97 826 1753";

export default function FloatingContact() {
  const [open, setOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      if (res.ok) {
        setMessage("");
        setSubject("");
        setMessageOpen(false);
        setOpen(false);
        alert(t("contact.messageSent"));
      } else {
        alert(t("contact.messageFailed"));
      }
    } catch {
      alert(t("contact.messageFailed"));
    }
    setSending(false);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full gradient-accent shadow-lg hover:shadow-xl transition-all"
        size="icon"
      >
        <MessageCircle className="h-6 w-6 text-accent-foreground" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-auto right-3 top-auto w-[calc(100%-1.5rem)] max-w-xs translate-x-0 translate-y-0 gap-3 rounded-xl p-4 sm:bottom-24 sm:right-6 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("contact.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <a
              href={`https://t.me/${TELEGRAM.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border p-2.5 text-sm transition-colors hover:bg-muted"
            >
              <MessageCircle className="h-5 w-5 text-accent shrink-0" />
              <div>
                <p className="font-medium">{t("contact.telegram")}</p>
                <p className="text-sm text-muted-foreground">{TELEGRAM}</p>
              </div>
            </a>
            <a
              href={`tel:${PHONE}`}
              className="flex items-center gap-3 rounded-lg border border-border p-2.5 text-sm transition-colors hover:bg-muted"
            >
              <Phone className="h-5 w-5 text-accent shrink-0" />
              <div>
                <p className="font-medium">{t("contact.phone")}</p>
                <p className="text-sm text-muted-foreground">{PHONE_LABEL}</p>
              </div>
            </a>
            <button
              className="flex w-full items-center gap-3 rounded-lg border border-border p-2.5 text-left text-sm transition-colors hover:bg-muted"
              onClick={() => {
                setOpen(false);
                setMessageOpen(true);
              }}
            >
              <Mail className="h-5 w-5 text-accent shrink-0" />
              <div>
                <p className="font-medium">{t("contact.sendMessage")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("contact.questionsFeedback")}
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-auto right-3 top-auto w-[calc(100%-1.5rem)] max-w-xs translate-x-0 translate-y-0 gap-3 rounded-xl p-4 sm:bottom-24 sm:right-6 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("contact.sendMessage")}</DialogTitle>
            <DialogDescription>
              {user
                ? t("contact.replyNotifications")
                : t("contact.signInReply")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <div className="space-y-1.5 text-left">
              <label className="text-sm font-medium text-foreground">
                {t("contact.subject")}
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("contact.subjectPlaceholder")}
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-sm font-medium text-foreground">
                {t("contact.message")}
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("contact.messagePlaceholder")}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              className="gradient-accent text-accent-foreground"
              disabled={sending || !message.trim()}
              onClick={handleSend}
            >
              {sending ? t("common.sending") : t("common.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
