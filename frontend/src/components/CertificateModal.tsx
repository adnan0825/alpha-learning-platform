import { X, Download } from "lucide-react";
import { Certificate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import CertificateTemplate from "./CertificateTemplate";

interface CertificateModalProps {
  certificate: Certificate | null;
  onClose: () => void;
  onDownload: () => void;
  downloading?: boolean;
}

export default function CertificateModal({
  certificate,
  onClose,
  onDownload,
  downloading = false,
}: CertificateModalProps) {
  if (!certificate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative flex flex-col items-center gap-4 rounded-lg bg-white p-6 shadow-2xl max-w-[95vw] max-h-[95vh] overflow-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Certificate preview */}
        <div className="overflow-auto">
          <CertificateTemplate certificate={certificate} size="preview" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button onClick={onDownload} disabled={downloading}>
            <Download className="mr-2 h-4 w-4" />
            {downloading ? "Downloading..." : "Download PDF"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
