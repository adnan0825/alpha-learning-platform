import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  ImageIcon,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { manualPaymentsAPI, uploadsAPI } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

const MAX_FILE_MB = 5;

function isScreenshotImage(file: File): boolean {
  if (file.type.startsWith("image/") && file.type !== "image/svg+xml")
    return true;
  return /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(file.name);
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
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingReceipt, setExistingReceipt] = useState<{
    status: string;
  } | null>(null);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    manualPaymentsAPI
      .getMyReceipts()
      .then((receipts) => {
        const receipt =
          receipts
            .filter((item) => String(item.course_id) === courseId)
            .find((item) => item.status !== "rejected") ??
          receipts.find((item) => String(item.course_id) === courseId);
        setExistingReceipt(receipt ? { status: receipt.status } : null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId, user]);

  const onPickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (!picked) return;
    if (!isScreenshotImage(picked)) {
      toast({
        title: t("receipt.imageRequired"),
        description: t("receipt.chooseImage"),
        variant: "destructive",
      });
      return;
    }
    if (picked.size > MAX_FILE_MB * 1024 * 1024) {
      toast({
        title: t("receipt.fileTooLarge"),
        description: t("receipt.maxSize", { size: MAX_FILE_MB }),
        variant: "destructive",
      });
      return;
    }
    setFile(picked);
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(picked);
    });
  };

  const submit = async () => {
    if (!user) {
      toast({
        title: t("receipt.signInRequired"),
        description: t("receipt.logInToUpload"),
        variant: "destructive",
      });
      return;
    }
    if (!file) {
      toast({
        title: t("receipt.chooseScreenshot"),
        description: t("receipt.chooseFirst"),
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { url } = await uploadsAPI.uploadImage(file);
      await manualPaymentsAPI.submitReceipt({
        courseId,
        receiptUrl: url,
        amountEtb,
        note: note.trim() || undefined,
      });
      setExistingReceipt({ status: "pending" });
      setFile(null);
      setPreviewUrl(null);
      setNote("");
      if (fileRef.current) fileRef.current.value = "";
      toast({
        title: t("receipt.submitted"),
        description: t("receipt.reviewDescription"),
      });
    } catch (error) {
      toast({
        title: t("receipt.submitFailed"),
        description: error instanceof Error ? error.message : "Upload failed.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed p-4">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );

  if (existingReceipt?.status === "pending") {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-warning">
          <Clock size={18} />
          <span className="text-sm font-semibold">
            Receipt pending approval
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Your receipt is waiting for admin verification. You will be enrolled
          after it is approved.
        </p>
      </div>
    );
  }

  if (existingReceipt?.status === "approved") {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-green-500">
          <CheckCircle2 size={18} />
          <span className="text-sm font-semibold">
            {t("receipt.paymentConfirmed")}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Your receipt was verified. Course access should now be available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
      {existingReceipt?.status === "rejected" && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive">
          <XCircle size={18} />
          <span className="text-sm font-semibold">
            Receipt rejected. Please submit a new one.
          </span>
        </div>
      )}
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Upload payment receipt
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          After paying {amountEtb.toLocaleString()} ETB manually, upload a
          screenshot or photo for {courseTitle}. JPG or PNG up to {MAX_FILE_MB}{" "}
          MB.
        </p>
      </div>
      {!user ? (
        <p className="text-sm text-muted-foreground">
          <Link
            to={`/login?redirect=${encodeURIComponent(`/course/${courseId}`)}`}
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            Sign in
          </Link>{" "}
          to submit your receipt.
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
              {file ? "Change receipt" : "Upload receipt"}
            </Button>
            {previewUrl && (
              <div className="max-h-40 overflow-hidden rounded-lg border border-border/60">
                <img
                  src={previewUrl}
                  alt={t("receipt.preview")}
                  className="max-h-40 w-auto object-contain"
                />
              </div>
            )}
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
              placeholder={t("receipt.notePlaceholder")}
              value={note}
              onChange={(event) => setNote(event.target.value)}
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
                Uploading...
              </>
            ) : (
              <>
                <Upload size={18} />
                Submit receipt
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
