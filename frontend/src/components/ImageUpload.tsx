/**
 * ImageUpload - File upload component for thumbnails/images.
 */
import React, { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  label,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: t("common.invalidFileType"),
        description: t("common.imageRequired"),
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("common.fileTooLarge"),
        description: t("common.maxFileSize"),
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { url } = await uploadsAPI.uploadImage(file);
      onChange(url);
      toast({
        title: t("common.uploadSuccess"),
        description: t("common.imageUploaded"),
      });
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({
        title: t("common.uploadFailed"),
        description: err.message || t("common.uploadError"),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset input value so same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img
            src={value}
            alt={t("common.uploaded")}
            className="w-full h-40 object-cover"
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
          className="w-full h-40 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-accent/50 hover:bg-accent/5 transition-colors"
        >
          {uploading ? (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-muted border-t-accent" />
              <span className="text-xs text-muted-foreground">
                {t("common.uploading")}
              </span>
            </>
          ) : (
            <>
              <ImageIcon size={24} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {label || t("common.uploadImage")}
              </span>
              <span className="text-xs text-muted-foreground/60">
                {t("common.browseOrDrop")}
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ImageUpload;
