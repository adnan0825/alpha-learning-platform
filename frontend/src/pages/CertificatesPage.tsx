import React, { useEffect, useRef, useState } from "react";
import { Award, Loader2 } from "lucide-react";
import { certificatesAPI, Certificate } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import CertificateModal from "@/components/CertificateModal";
import CertificateTemplate from "@/components/CertificateTemplate";
import { exportCertificatePDF } from "@/lib/pdfExporter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const CertificatesPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selected, setSelected] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    certificatesAPI
      .getByStudent(user.id)
      .then(setCertificates)
      .catch((error) => console.error("Failed to load certificates:", error))
      .finally(() => setLoading(false));
  }, [user]);

  const download = async () => {
    if (!selected || !certificateRef.current) return;
    setDownloading(true);
    try {
      await exportCertificatePDF(
        certificateRef.current,
        selected.certificateNumber,
      );
    } catch (error) {
      console.error("Failed to download certificate:", error);
      toast({
        title: t("common.downloadFailed"),
        description:
          error instanceof Error
            ? error.message
            : t("common.certificateDownloadError"),
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Certificates
        </h1>
        <p className="text-sm text-muted-foreground">
          Certificates appear here after you complete a course.
        </p>
      </div>
      {certificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Award size={42} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No certificates yet. Complete an enrolled course to earn one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {certificates.map((certificate) => (
            <Card key={certificate.id}>
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-semibold text-foreground">
                    {certificate.courseTitle}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("certificate.issued")}{" "}
                    {new Date(certificate.issuedAt).toLocaleDateString()}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {certificate.certificateNumber}
                  </p>
                </div>
                <Button onClick={() => setSelected(certificate)}>
                  View <Award size={15} className="ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <CertificateModal
        certificate={selected}
        onClose={() => setSelected(null)}
        onDownload={download}
        downloading={downloading}
      />
      {selected && (
        <div
          className="pointer-events-none fixed -left-[2000px] top-0"
          aria-hidden="true"
        >
          <div ref={certificateRef}>
            <CertificateTemplate certificate={selected} size="full" />
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificatesPage;
