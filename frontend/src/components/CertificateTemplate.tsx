import { QRCodeSVG } from "qrcode.react";
import { Certificate } from "@/lib/api";
import logoUrl from "@/assets/logo.svg";
import { useLanguage } from "@/contexts/LanguageContext";

interface CertificateTemplateProps {
  certificate: Certificate;
  size?: "preview" | "full";
}

function formatDate(isoString: string, lang: "en" | "sm"): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(lang === "sm" ? "so-SO" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Colors
const NAVY = "#0a1628";
const GOLD = "#c9a84c";
const GOLD_LIGHT = "#e8c97a";
const CREAM = "#fdf8f0";
const WHITE = "#ffffff";

// Fixed canvas size (A4 landscape at 96dpi)
const FULL_W = 1056;
const FULL_H = 748;
const PREVIEW_SCALE = 0.6;

export default function CertificateTemplate({
  certificate,
  size = "full",
}: CertificateTemplateProps) {
  const { lang, t } = useLanguage();
  const isPreview = size === "preview";
  const scale = isPreview ? PREVIEW_SCALE : 1;

  const containerStyle: React.CSSProperties = {
    width: FULL_W,
    height: FULL_H,
    transformOrigin: "top left",
    transform: isPreview ? `scale(${scale})` : undefined,
    // When preview, shrink the outer box so it doesn't take up full space
    ...(isPreview
      ? {
          marginBottom: -(FULL_H * (1 - PREVIEW_SCALE)),
          marginRight: -(FULL_W * (1 - PREVIEW_SCALE)),
        }
      : {}),
  };

  return (
    <div style={containerStyle}>
      <div
        style={{
          width: FULL_W,
          height: FULL_H,
          backgroundColor: CREAM,
          position: "relative",
          fontFamily: "Georgia, 'Times New Roman', serif",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Outer gold border */}
        <div
          style={{
            position: "absolute",
            inset: 12,
            border: `3px solid ${GOLD}`,
            pointerEvents: "none",
          }}
        />
        {/* Inner thin border */}
        <div
          style={{
            position: "absolute",
            inset: 20,
            border: `1px solid ${GOLD}`,
            pointerEvents: "none",
          }}
        />

        {/* Navy header band */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 110,
            backgroundColor: NAVY,
            display: "flex",
            alignItems: "center",
            paddingLeft: 36,
            paddingRight: 36,
            gap: 20,
          }}
        >
          {/* Logo */}
          <img
            src={logoUrl}
            alt={t("certificate.alphaLogo")}
            style={{ width: 72, height: 72, flexShrink: 0 }}
          />

          {/* Academy name */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: GOLD,
                fontSize: 22,
                fontWeight: "bold",
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              Alpha
            </div>
            <div
              style={{
                color: GOLD_LIGHT,
                fontSize: 12,
                letterSpacing: 2,
                marginTop: 4,
                opacity: 0.85,
              }}
            >
              {t("certificate.excellence")}
            </div>
          </div>

          {/* Right decorative element */}
          <div
            style={{
              width: 60,
              height: 60,
              border: `2px solid ${GOLD}`,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                color: GOLD,
                fontSize: 10,
                textAlign: "center",
                letterSpacing: 1,
                lineHeight: 1.3,
              }}
            >
              EST.
              <br />
              2020
            </div>
          </div>
        </div>

        {/* Gold divider line below header */}
        <div
          style={{
            position: "absolute",
            top: 110,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: GOLD,
          }}
        />

        {/* Main content area */}
        <div
          style={{
            position: "absolute",
            top: 114,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 28,
            paddingBottom: 20,
            paddingLeft: 60,
            paddingRight: 60,
          }}
        >
          {/* Certificate of Completion heading */}
          <div
            style={{
              color: NAVY,
              fontSize: 32,
              fontWeight: "bold",
              letterSpacing: 6,
              textTransform: "uppercase",
              textAlign: "center",
              marginBottom: 6,
            }}
          >
            {t("certificate.title")}
          </div>

          {/* Gold ornamental divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div style={{ width: 80, height: 1, backgroundColor: GOLD }} />
            <div
              style={{
                width: 8,
                height: 8,
                backgroundColor: GOLD,
                transform: "rotate(45deg)",
              }}
            />
            <div style={{ width: 80, height: 1, backgroundColor: GOLD }} />
          </div>

          {/* "This is to certify that" */}
          <div
            style={{
              color: "#555",
              fontSize: 15,
              fontStyle: "italic",
              marginBottom: 10,
            }}
          >
            {t("certificate.certifies")}
          </div>

          {/* Student name */}
          <div
            style={{
              color: NAVY,
              fontSize: 42,
              fontWeight: "bold",
              fontStyle: "italic",
              textAlign: "center",
              marginBottom: 10,
              lineHeight: 1.1,
            }}
          >
            {certificate.studentName}
          </div>

          {/* "has successfully completed" */}
          <div
            style={{
              color: "#555",
              fontSize: 15,
              fontStyle: "italic",
              marginBottom: 8,
            }}
          >
            {t("certificate.completedCourse")}
          </div>

          {/* Course title */}
          <div
            style={{
              color: NAVY,
              fontSize: 22,
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: 20,
              maxWidth: 700,
            }}
          >
            {certificate.courseTitle}
          </div>

          {/* Bottom row: instructor + date + signature | cert number + QR */}
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginTop: "auto",
            }}
          >
            {/* Left: instructor + date */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div
                  style={{
                    color: "#888",
                    fontSize: 11,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {t("certificate.instructor")}
                </div>
                <div style={{ color: NAVY, fontSize: 16, fontWeight: "bold" }}>
                  {certificate.instructorName}
                </div>
              </div>
              <div>
                <div
                  style={{
                    color: "#888",
                    fontSize: 11,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {t("certificate.dateIssued")}
                </div>
                <div style={{ color: NAVY, fontSize: 16 }}>
                  {formatDate(certificate.issuedAt, lang)}
                </div>
              </div>
            </div>

            {/* Center: signature line */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  fontFamily: "'Brush Script MT', cursive",
                  fontSize: 36,
                  color: NAVY,
                  lineHeight: 1,
                }}
              >
                {t("certificate.academyDirector")}
              </div>
              <div
                style={{
                  width: 200,
                  height: 1,
                  backgroundColor: NAVY,
                }}
              />
              <div
                style={{
                  color: "#888",
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                {t("certificate.academyDirector")}
              </div>
            </div>

            {/* Right: cert number + QR code */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 8,
              }}
            >
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    color: "#888",
                    fontSize: 11,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {t("certificate.number")}
                </div>
                <div
                  style={{
                    color: NAVY,
                    fontSize: 13,
                    fontFamily: "monospace",
                    fontWeight: "bold",
                  }}
                >
                  {certificate.certificateNumber}
                </div>
              </div>
              <div
                style={{
                  padding: 6,
                  backgroundColor: WHITE,
                  border: `2px solid ${GOLD}`,
                  borderRadius: 4,
                }}
              >
                <QRCodeSVG
                  value={certificate.verificationUrl}
                  size={80}
                  bgColor={WHITE}
                  fgColor={NAVY}
                  level="M"
                />
              </div>
              <div
                style={{
                  color: "#aaa",
                  fontSize: 9,
                  letterSpacing: 0.5,
                  textAlign: "right",
                }}
              >
                {t("certificate.scanToVerify")}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom gold band */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            backgroundColor: GOLD,
          }}
        />
      </div>
    </div>
  );
}
