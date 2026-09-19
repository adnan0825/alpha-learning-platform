/**
 * PDF Exporter - Renders a CertificateTemplate DOM node to a downloadable PDF.
 * Uses html2canvas to rasterize the element, then jsPDF to embed it in A4 landscape.
 */
/**
 * Captures the given DOM element as a canvas image and saves it as an A4 landscape PDF.
 * @param element - The rendered CertificateTemplate div (full size, not preview)
 * @param certificateNumber - Used to name the file: certificate-{certificateNumber}.pdf
 */
export async function exportCertificatePDF(
  element: HTMLDivElement,
  certificateNumber: string,
): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2, // 2× for crisp output
    useCORS: true, // allow cross-origin images (logo, QR)
    backgroundColor: "#fdf8f0",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");

  // A4 landscape in mm: 297 × 210
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  pdf.addImage(imgData, "PNG", 0, 0, pageW, pageH);
  pdf.save(`certificate-${certificateNumber}.pdf`);
}
