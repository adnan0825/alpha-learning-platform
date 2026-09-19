/**
 * VideoUpload - Upload and preview application-managed videos.
 */
import React, { useEffect, useRef, useState } from "react";
import { Upload, X, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface VideoUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  accept?: string;
  maxSizeLabel?: string;
  visibility?: "public" | "protected";
}

const VideoUpload: React.FC<VideoUploadProps> = ({
  value,
  onChange,
  label,
  accept = "video/*",
  maxSizeLabel = "Up to 200MB",
  visibility = "protected",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewSource, setPreviewSource] = useState(value || "");
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (!value || !value.includes("/api/uploads/video/")) {
      setPreviewSource(value || "");
      return;
    }
    const controller = new AbortController();
    setPreviewSource("");
    fetch(`${value}/access`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Video preview unavailable");
        return response.json() as Promise<{ url: string }>;
      })
      .then((payload) => setPreviewSource(payload.url))
      .catch(() => setPreviewSource(""));
    return () => controller.abort();
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed =
      /\.(mp4|webm|mov|m4v|ogv|mkv|avi)$/i.test(file.name) ||
      file.type.startsWith("video/");
    if (!allowed) {
      toast({
        title: t("common.videoInvalid"),
        description: t("common.videoFormats"),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      toast({
        title: t("common.videoTooLarge"),
        description: maxSizeLabel,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const { url } = await uploadsAPI.uploadVideo(
        file,
        setProgress,
        visibility,
      );
      onChange(url);
      toast({
        title: t("common.uploadSuccess"),
        description: t("common.videoUploaded"),
      });
    } catch (err: unknown) {
      console.error("Video upload error:", err);
      toast({
        title: t("common.uploadFailed"),
        description:
          err instanceof Error ? err.message : t("common.videoUploadFailed"),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <video
            src={previewSource}
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            disableRemotePlayback
            onContextMenu={(event) => event.preventDefault()}
            className="w-full h-40 object-cover bg-black"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={() => onChange("")}
          >
            <X size={14} />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-36 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-accent/50 hover:bg-accent/5 transition-colors"
        >
          {uploading ? (
            <>
              <div className="h-2 w-3/4 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-accent transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {t("common.videoUploading", { percent: progress })}
              </span>
            </>
          ) : (
            <>
              <VideoIcon size={24} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {label || t("common.uploadVideo")}
              </span>
              <span className="text-xs text-muted-foreground/60">
                {maxSizeLabel}
              </span>
            </>
          )}
        </button>
      )}

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Upload size={12} />
        <span>{t("common.videoHelp")}</span>
      </div>
    </div>
  );
};

export default VideoUpload;
