/**
 * Upload a payment receipt screenshot after a manual bank/wallet transfer.
 */
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Upload,
  Loader2,
  ImageIcon,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { paymentsAPI, uploadsAPI } from "@/lib/api";

const MAX_FILE_MB = 5;

function isScreenshotImage(f: File): boolean {
  if (f.type.startsWith("image/") && f.type !== "image/svg+xml") return true;
  const n = f.name.toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/.test(n);
}

export function ManualPaymentReceiptUpload({
  courseId,
  courseTitle,
  amountEtb,
}: {
  courseId: string;
  courseTitle: string;
  amountEtb: number;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingReceipt, setExistingReceipt] = useState<{
    status: string;
    created_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    paymentsAPI
      .getMyReceipts()
      .then((receipts) => {
        const courseReceipts = receipts.filter(
          (r) => String(r.course_id) === courseId,
        );
        const active = courseReceipts.find((r) => r.status !== "rejected");
        const rejected = courseReceipts.find((r) => r.status === "rejected");

        if (active) {
          setExistingReceipt({
            status: active.status,
            created_at: active.created_at,
          });
        } else if (rejected) {
          setExistingReceipt({
            status: "rejected",
            created_at: rejected.created_at,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, courseId]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!isScreenshotImage(f)) {
      toast({
        title: "Image required",
        description:
          "Please choose a screenshot or photo (JPG, PNG, or similar). PDFs are not supported.",
        variant: "destructive",
      });
      return;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Maximum size is ${MAX_FILE_MB} MB.`,
        variant: "destructive",
      });
      return;
    }
    setFile(f);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  const submit = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Log in to upload your receipt screenshot.",
        variant: "destructive",
      });
      return;
    }
    if (!file) {
      toast({
        title: "Choose a screenshot",
        description: "Select an image of your payment receipt first.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { url } = await uploadsAPI.uploadImage(file);
      await paymentsAPI.submitManualReceipt({
        courseId,
        receiptUrl: url,
        amountEtb,
        note: note.trim() || undefined,
      });
      toast({
        title: "Screenshot submitted",
        description:
          "We'll review your payment and confirm access when it's verified.",
      });
      setExistingReceipt({
        status: "pending",
        created_at: new Date().toISOString(),
      });
      setFile(null);
      setPreviewUrl(null);
      setNote("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Upload failed. Try again.";
      toast({
        title: "Could not submit",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }

  // --- Existing receipt: pending ---
  if (existingReceipt?.status === "pending") {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
        <div className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-warning" />
            <span className="text-sm font-semibold text-warning">
              Payment pending approval
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your receipt has been submitted and is awaiting admin verification.
            This typically takes a few minutes to a single day. You will be
            enrolled in the course once your payment is confirmed.
          </p>
        </div>
      </div>
    );
  }

  // --- Existing receipt: approved ---
  if (existingReceipt?.status === "approved") {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
        <div className="flex flex-col gap-3 rounded-lg border border-green-400/40 bg-green-500/10 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-500" />
            <span className="text-sm font-semibold text-green-500">
              Payment confirmed
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your payment has been verified. You should now have access to this
            course.
          </p>
        </div>
      </div>
    );
  }

  // --- Upload form (no receipt, or rejected) ---
  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
      {existingReceipt?.status === "rejected" && (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <div className="flex items-center gap-2">
            <XCircle size={18} className="text-destructive" />
            <span className="text-sm font-semibold text-destructive">
              Payment rejected
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your previous payment receipt was not accepted. Please upload a new
            receipt below. If you believe this is an error, contact support.
          </p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Upload your payment receipt screenshot
        </h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          After you pay manually, take a screenshot or photo of the confirmation
          (Telebirr, bank app, SMS, etc.) and upload it here — JPG or PNG, up to{" "}
          {MAX_FILE_MB} MB. Mention the course ({courseTitle}) and{" "}
          {amountEtb.toLocaleString()} ETB in the transfer note when you pay, if
          the app allows it.
        </p>
      </div>

      {!user ? (
        <p className="text-sm text-muted-foreground">
          <Link
            to="/login"
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            Sign in
          </Link>{" "}
          to submit your screenshot.
        </p>
      ) : (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="sr-only"
            onChange={onPickFile}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
              onClick={() => fileRef.current?.click()}
              disabled={submitting}
            >
              <ImageIcon size={16} />
              {file ? "Change Payment Receipt" : "Upload Payment Receipt"}
            </Button>
            {previewUrl ? (
              <div className="relative max-h-40 overflow-hidden rounded-lg border border-border/60 bg-background">
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="max-h-40 w-auto object-contain"
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="manual-pay-note"
              className="text-xs text-muted-foreground"
            >
              Optional note
            </Label>
            <Textarea
              id="manual-pay-note"
              placeholder="e.g. transaction reference, date, or payer name"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="resize-none text-sm"
              disabled={submitting}
              maxLength={2000}
            />
          </div>

          <Button
            type="button"
            className="w-full gap-2 sm:w-auto"
            onClick={submit}
            disabled={submitting || !file}
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Uploading…
              </>
            ) : (
              <>
                <Upload size={18} />
                Submit screenshot
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
