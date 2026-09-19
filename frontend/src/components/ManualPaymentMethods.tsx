import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
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
    account: "1000537656983",
    holder: "Abdulgefar Husen",
  },
  {
    baseName: "ebirr",
    label: "E-Birr",
    accountLabel: "Account / phone",
    account: "0967240051",
    holder: "Abdulgefar Husen",
  },
  {
    baseName: "telebirr",
    label: "Telebirr",
    accountLabel: "Phone number",
    account: "0967240051",
    holder: "Abdulgefar Husen",
  },
] as const;

export function ManualPaymentMethods({
  courseTitle,
  amountEtb,
}: {
  courseTitle: string;
  amountEtb: number;
}) {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast({ title: "Copied", description: `${label} number copied` });
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast({
        title: "Could not copy",
        description: "Select the text and copy manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Pay manually</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Send{" "}
          <span className="font-medium text-foreground">
            {amountEtb.toLocaleString()} ETB
          </span>{" "}
          for <span className="font-medium text-foreground">{courseTitle}</span>{" "}
          using one of the options below, then upload your receipt for review.
        </p>
      </div>
      <ul className="space-y-3">
        {METHODS.map((method) => (
          <li
            key={method.label}
            className="flex gap-3 rounded-lg border border-border/50 bg-muted/25 p-3"
          >
            <PaymentLogo baseName={method.baseName} label={method.label} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {method.label}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {method.accountLabel}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-medium text-foreground">
                  {method.account}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() =>
                    copy(method.account, method.label, method.label)
                  }
                >
                  {copiedKey === method.label ? (
                    <Check size={12} className="text-success" />
                  ) : (
                    <Copy size={12} />
                  )}
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Account holder:{" "}
                <span className="font-medium text-foreground">
                  {method.holder}
                </span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
