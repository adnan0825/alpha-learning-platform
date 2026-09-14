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

const TELEGRAM = "@alpha_contact";
const PHONE = "0938350004";

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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("contact.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <a
              href={`https://t.me/${TELEGRAM.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <MessageCircle className="h-5 w-5 text-accent shrink-0" />
              <div>
                <p className="font-medium">{t("contact.telegram")}</p>
                <p className="text-sm text-muted-foreground">{TELEGRAM}</p>
              </div>
            </a>
            <a
              href={`tel:${PHONE}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <Phone className="h-5 w-5 text-accent shrink-0" />
              <div>
                <p className="font-medium">{t("contact.phone")}</p>
                <p className="text-sm text-muted-foreground">{PHONE}</p>
              </div>
            </a>
            <button
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("contact.sendMessage")}</DialogTitle>
            <DialogDescription>
              {user
                ? t("contact.replyNotifications")
                : t("contact.signInReply")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
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
                rows={5}
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
