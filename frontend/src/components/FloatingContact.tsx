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

const TELEGRAM = "@alpha_contact";
const PHONE = "0938350004";

export default function FloatingContact() {
  const [open, setOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { user } = useAuth();

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
        alert("Message sent successfully!");
      } else {
        alert("Failed to send message");
      }
    } catch {
      alert("Failed to send message");
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
            <DialogTitle>Contact Us</DialogTitle>
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
                <p className="font-medium">Telegram</p>
                <p className="text-sm text-muted-foreground">{TELEGRAM}</p>
              </div>
            </a>
            <a
              href={`tel:${PHONE}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <Phone className="h-5 w-5 text-accent shrink-0" />
              <div>
                <p className="font-medium">Phone</p>
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
                <p className="font-medium">Send a Message</p>
                <p className="text-sm text-muted-foreground">
                  Questions & feedback
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send a Message</DialogTitle>
            <DialogDescription>
              {user
                ? "We'll reply in your notifications."
                : "Sign in so we know who you are and can reply."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5 text-left">
              <label className="text-sm font-medium text-foreground">
                Subject
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Enrollment question"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-sm font-medium text-foreground">
                Message
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your question or feedback..."
                rows={5}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageOpen(false)}>
              Cancel
            </Button>
            <Button
              className="gradient-accent text-accent-foreground"
              disabled={sending || !message.trim()}
              onClick={handleSend}
            >
              {sending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
