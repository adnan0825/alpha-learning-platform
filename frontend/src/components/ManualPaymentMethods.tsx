/**
 * Manual bank / wallet transfer details shown alongside Chapa checkout.
 * Logos: place `cbe.png` (or .svg), `ebirr.png`, `telebirr.png` in `frontend/public/`.
 */
import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const LOGO_EXTENSIONS = [".png", ".svg", ".webp"] as const;

function PaymentLogo({ baseName, label }: { baseName: string; label: string }) {
  const [extIndex, setExtIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed || extIndex >= LOGO_EXTENSIONS.length) {
    return (
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold uppercase text-muted-foreground ring-1 ring-border/60"
        aria-hidden
      >
        {label.slice(0, 2)}
      </div>
    );
  }

  const src = `/${baseName}${LOGO_EXTENSIONS[extIndex]}`;

  return (
    <img
      src={src}
      alt=""
      className="h-11 w-auto max-w-[100px] shrink-0 object-contain object-left"
      onError={() => {
        if (extIndex + 1 < LOGO_EXTENSIONS.length) setExtIndex((i) => i + 1);
        else setFailed(true);
      }}
    />
  );
}

const METHODS = [
  {
    baseName: "cbe",
    label: "CBE Bank",
    accountLabel: "Account number",
    account: "1000221942268",
    holder: "Abdulfetah Jemal",
  },
  {
    baseName: "ebirr",
    label: "E-Birr",
    accountLabel: "Account / phone",
    account: "0961219838",
    holder: "Abdulfetah Jemal",
  },
  {
    baseName: "telebirr",
    label: "Telebirr",
    accountLabel: "Phone number",
    account: "0961219838",
    holder: "Abdulfetah Jemal",
  },
] as const;

export function ManualPaymentMethods({ courseTitle, amountEtb }: { courseTitle: string; amountEtb: number }) {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = async (text: string, key: string, description: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast({ title: "Copied", description });
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast({ title: "Could not copy", description: "Select the text and copy manually.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Pay manually</h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Send <span className="font-medium text-foreground">{amountEtb.toLocaleString()} ETB</span> for{" "}
          <span className="font-medium text-foreground">{courseTitle}</span> using one of the options below. Include your
          name and course title in the payment note if the app allows it. After paying, you can still use{" "}
          <span className="font-medium text-foreground">Enroll</span> if the course is free, or wait for staff to confirm
          your payment.
        </p>
      </div>
      <ul className="space-y-3">
        {METHODS.map((m) => (
          <li
            key={m.baseName}
            className="flex gap-3 rounded-lg border border-border/50 bg-muted/25 p-3 dark:bg-muted/15"
          >
            <PaymentLogo baseName={m.baseName} label={m.label} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold text-foreground">{m.label}</p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.accountLabel}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-medium text-foreground">{m.account}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => copy(m.account, m.baseName, `${m.label} number copied`)}
                >
                  {copiedKey === m.baseName ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Account holder: <span className="font-medium text-foreground">{m.holder}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
