/**
 * VerifyPage - Public certificate verification page.
 * Accessible without authentication via /verify/:certificateNumber
 */
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { certificatesAPI, Certificate } from "@/lib/api";
import CertificateTemplate from "@/components/CertificateTemplate";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { useLanguage } from "@/contexts/LanguageContext";

const VerifyPage: React.FC = () => {
  const { t } = useLanguage();
  const { certificateNumber } = useParams<{ certificateNumber: string }>();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [status, setStatus] = useState<
    "loading" | "found" | "not_found" | "error"
  >("loading");

  useEffect(() => {
    if (!certificateNumber) {
      setStatus("not_found");
      return;
    }
    certificatesAPI
      .verify(certificateNumber)
      .then((cert) => {
        setCertificate(cert);
        setStatus("found");
      })
      .catch((err) => {
        if (
          err.message?.includes("404") ||
          err.message?.includes("not found")
        ) {
          setStatus("not_found");
        } else {
          setStatus("error");
        }
      });
  }, [certificateNumber]);

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header className="border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logo}
              alt=""
              className="h-8 w-8 rounded-lg object-cover"
            />
            <span className="font-semibold text-foreground">Alpha</span>
          </Link>
          <span className="ml-2 text-xs text-muted-foreground">
            — {t("verify.title")}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 size={40} className="animate-spin text-accent" />
            <p className="text-muted-foreground">{t("verify.loading")}</p>
          </div>
        )}

        {status === "not_found" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <XCircle size={56} className="text-destructive" />
            <h1 className="font-display text-2xl font-bold text-foreground">
              {t("verify.notFound")}
            </h1>
            <p className="text-muted-foreground max-w-md">
              {t("verify.notFoundDescription")}{" "}
              <span className="font-mono font-semibold text-foreground">
                {certificateNumber}
              </span>{" "}
            </p>
            <Button asChild variant="outline" className="mt-2">
              <Link to="/">{t("verify.home")}</Link>
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <XCircle size={56} className="text-destructive" />
            <h1 className="font-display text-2xl font-bold text-foreground">
              {t("verify.failed")}
            </h1>
            <p className="text-muted-foreground">
              {t("verify.failedDescription")}
            </p>
          </div>
        )}

        {status === "found" && certificate && (
          <div className="space-y-6">
            {/* Verified badge */}
            <div className="flex items-center justify-center gap-3 rounded-xl border border-green-200 bg-green-50 px-6 py-4 dark:border-green-900 dark:bg-green-950/30">
              <CheckCircle size={28} className="text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-400">
                  {t("verify.verified")}
                </p>
                <p className="text-sm text-green-700 dark:text-green-500">
                  {t("verify.authentic")}
                </p>
              </div>
            </div>

            {/* Certificate preview */}
            <div className="overflow-x-auto rounded-xl border border-border shadow-lg">
              <CertificateTemplate certificate={certificate} size="preview" />
            </div>

            {/* Details summary */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
              {[
                { label: t("verify.student"), value: certificate.studentName },
                { label: t("verify.course"), value: certificate.courseTitle },
                {
                  label: t("verify.instructor"),
                  value: certificate.instructorName,
                },
                {
                  label: t("verify.issued"),
                  value: new Date(certificate.issuedAt).toLocaleDateString(
                    "en-US",
                    { year: "numeric", month: "long", day: "numeric" },
                  ),
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {label}
                  </p>
                  <p className="font-medium text-foreground mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default VerifyPage;
