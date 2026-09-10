# Requirements Document

## Introduction

This feature adds automated certificate generation to the Alpha LMS. When a student completes 100% of a course, the system automatically issues a professionally designed certificate. The certificate includes all required fields (student name, course name, instructor name, issue date, unique certificate number, academy logo, QR code, and a signature line), is viewable in-browser on the CertificatesPage, downloadable as a PDF, and publicly verifiable via a dedicated verification page.

## Glossary

- **Certificate**: A digital document issued to a student upon completing 100% of a course.
- **Certificate_Generator**: The backend service responsible for creating and storing certificates.
- **Certificate_Renderer**: The frontend component responsible for displaying a certificate visually.
- **PDF_Exporter**: The frontend service responsible for converting a rendered certificate into a downloadable PDF file.
- **QR_Code**: A machine-readable code embedded in the certificate that encodes the public verification URL for that certificate.
- **Verification_Page**: A publicly accessible page that displays certificate details when given a valid certificate number or ID.
- **Progress_Service**: The existing backend service that tracks lesson completion and calculates course completion percentage.
- **Certificate_Number**: A unique human-readable identifier for a certificate, formatted as `SOTA-{YEAR}-{NNNNN}`.
- **Completion_Trigger**: The event fired when a student's course progress reaches 100%.

---

## Requirements

### Requirement 1: Automatic Certificate Issuance

**User Story:** As a student, I want to automatically receive a certificate when I complete 100% of a course, so that my achievement is recognized without any manual steps.

#### Acceptance Criteria

1. WHEN a student marks the final lesson of a course as complete AND the resulting course completion percentage equals 100, THE Certificate_Generator SHALL automatically issue a certificate for that student and course.
2. WHEN the Certificate_Generator issues a certificate, THE Certificate_Generator SHALL assign a unique Certificate_Number in the format `SOTA-{YEAR}-{NNNNN}` where YEAR is the 4-digit issue year and NNNNN is a zero-padded sequential count.
3. WHEN the Certificate_Generator issues a certificate, THE Certificate_Generator SHALL record the issue date as the UTC timestamp at the moment of issuance.
4. IF a certificate already exists for a given student and course combination, THEN THE Certificate_Generator SHALL not issue a duplicate certificate and SHALL return the existing certificate.
5. IF a student's course completion percentage is less than 100, THEN THE Certificate_Generator SHALL not issue a certificate for that course.

---

### Requirement 2: Certificate Data Model

**User Story:** As a developer, I want the certificate to store all required fields, so that the certificate can be rendered completely without additional lookups.

#### Acceptance Criteria

1. THE Certificate_Generator SHALL store the following fields for every certificate: certificate ID, Certificate_Number, student ID, student full name, course ID, course title, instructor name, issue date, and QR code verification URL.
2. WHEN a certificate is created, THE Certificate_Generator SHALL derive the instructor name from the course record at the time of issuance.
3. WHEN a certificate is created, THE Certificate_Generator SHALL construct the QR code verification URL as `{BASE_URL}/verify/{certificateNumber}`.

---

### Requirement 3: Certificate Visual Design

**User Story:** As a student, I want my certificate to look professional and printable, so that I can share it with employers or display it proudly.

#### Acceptance Criteria

1. THE Certificate_Renderer SHALL display the Alpha logo on every certificate.
2. THE Certificate_Renderer SHALL display the student's full name prominently on every certificate.
3. THE Certificate_Renderer SHALL display the course title on every certificate.
4. THE Certificate_Renderer SHALL display the instructor's name on every certificate.
5. THE Certificate_Renderer SHALL display the issue date formatted as a human-readable date (e.g., "January 1, 2025") on every certificate.
6. THE Certificate_Renderer SHALL display the Certificate_Number on every certificate.
7. THE Certificate_Renderer SHALL display a QR_Code that encodes the certificate's public verification URL on every certificate.
8. THE Certificate_Renderer SHALL display a signature line attributed to the academy director or instructor on every certificate.
9. THE Certificate_Renderer SHALL render the certificate at a fixed landscape aspect ratio suitable for printing on A4 paper.

---

### Requirement 4: In-Browser Certificate Viewing

**User Story:** As a student, I want to view my certificates in the browser on the Certificates page, so that I can review them at any time.

#### Acceptance Criteria

1. WHEN a student navigates to the CertificatesPage, THE Certificate_Renderer SHALL display all certificates earned by that student.
2. WHEN a student clicks to view a certificate, THE Certificate_Renderer SHALL display the full visual certificate design in a modal or dedicated view.
3. WHILE a certificate is being loaded, THE Certificate_Renderer SHALL display a loading indicator.
4. IF a student has no certificates, THEN THE Certificate_Renderer SHALL display an empty state message indicating no certificates have been earned yet.

---

### Requirement 5: PDF Download

**User Story:** As a student, I want to download my certificate as a PDF, so that I can save and share it offline.

#### Acceptance Criteria

1. WHEN a student clicks the download button on a certificate, THE PDF_Exporter SHALL generate and download a PDF file of that certificate.
2. WHEN the PDF_Exporter generates a PDF, THE PDF_Exporter SHALL preserve the full visual design of the certificate including logo, QR code, and all text fields.
3. WHEN the PDF_Exporter generates a PDF, THE PDF_Exporter SHALL name the file `certificate-{certificateNumber}.pdf`.
4. IF the PDF generation fails, THEN THE PDF_Exporter SHALL display an error message to the student.

---

### Requirement 6: Public Certificate Verification

**User Story:** As an employer or third party, I want to verify a certificate's authenticity by visiting a public URL or scanning the QR code, so that I can confirm a student's completion of a course.

#### Acceptance Criteria

1. THE Verification_Page SHALL be publicly accessible without requiring authentication.
2. WHEN a visitor navigates to `/verify/{certificateNumber}`, THE Verification_Page SHALL display the certificate details including student name, course title, instructor name, Certificate_Number, and issue date.
3. WHEN a visitor scans the QR_Code on a certificate, THE Verification_Page SHALL display the same certificate details as navigating directly to the verification URL.
4. IF the certificate number provided does not match any certificate in the system, THEN THE Verification_Page SHALL display a clear "Certificate not found" message.
5. THE Verification_Page SHALL display a visual indicator confirming the certificate is valid and authentic.

---

### Requirement 7: Backend Verification API

**User Story:** As a developer, I want a public API endpoint to look up certificate details by certificate number, so that the verification page can retrieve certificate data without authentication.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/certificates/verify/{certificateNumber}`, THE Certificate_Generator SHALL return the certificate details if the certificate exists.
2. IF the certificate number does not exist, THEN THE Certificate_Generator SHALL return a 404 response with a descriptive error message.
3. THE Certificate_Generator SHALL serve the verification endpoint without requiring an authentication token.

---

### Requirement 8: Student Notification on Certificate Issuance

**User Story:** As a student, I want to be notified when my certificate is issued, so that I know my course completion has been recognized.

#### Acceptance Criteria

1. WHEN a certificate is issued, THE Certificate_Generator SHALL create a notification for the student with type "certificate" containing a link to the CertificatesPage.
2. WHEN a certificate notification is created, THE Certificate_Generator SHALL set the notification message to include the course title.
