# Implementation Plan: Certificate Generation

## Overview

Implement automated certificate generation, in-browser viewing, PDF download, and public verification for the Alpha LMS. Tasks build incrementally from backend data layer through frontend rendering to public verification.

## Tasks

- [x] 1. Extend the database schema and backend data model
  - Add `instructor_name`, `student_name`, and `verification_url` columns to the `certificates` table via a migration SQL script
  - Update the `Certificate` interface in `frontend/src/lib/api.ts` to add `instructorName` and `verificationUrl` fields
  - Update the `certificates` route GET handler to include the new columns in the SELECT and response mapping
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Implement `certificateService.ts` and auto-issuance trigger
  - [x] 2.1 Create `backend/src/services/certificateService.ts` with `autoIssue(studentId, courseId)` and `getByNumber(certificateNumber)` functions
    - `autoIssue` must check for existing certificate (idempotency), verify 100% completion, generate the certificate number, populate all required fields including instructor name and verification URL, insert the row, and create a notification
    - `getByNumber` must return the full certificate row or null
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 8.1, 8.2_

  - [ ]\* 2.2 Write property test for `autoIssue` idempotency
    - **Property 1: No duplicate certificates**
    - **Validates: Requirements 1.4**
    - Use fast-check to generate random (studentId, courseId) pairs, call autoIssue twice, assert exactly one certificate row exists
    - `// Feature: certificate-generation, Property 1: No duplicate certificates`

  - [ ]\* 2.3 Write property test for certificate number format
    - **Property 2: Certificate number format invariant**
    - **Validates: Requirements 1.2**
    - Use fast-check to generate N certificates, assert all numbers match `/^SOTA-\d{4}-\d{5}$/`
    - `// Feature: certificate-generation, Property 2: Certificate number format invariant`

  - [ ]\* 2.4 Write property test for auto-issue guard at < 100% completion
    - **Property 3: Auto-issue only at 100% completion**
    - **Validates: Requirements 1.5**
    - Use fast-check to generate progress values in [0, 99], assert no certificate row is created
    - `// Feature: certificate-generation, Property 3: Auto-issue only at 100% completion`

  - [ ]\* 2.5 Write property test for certificate data completeness
    - **Property 5: Certificate data completeness**
    - **Validates: Requirements 2.1, 2.2, 1.1**
    - Use fast-check to generate valid (student, course) pairs, issue certificate, assert all required fields are non-empty strings
    - `// Feature: certificate-generation, Property 5: Certificate data completeness`

  - [ ]\* 2.6 Write property test for notification on issuance
    - **Property 8: Notification issued on certificate creation**
    - **Validates: Requirements 8.1, 8.2**
    - Use fast-check to generate (student, course) pairs, issue certificate, assert notification row exists with type "certificate" and message containing course title
    - `// Feature: certificate-generation, Property 8: Notification issued on certificate creation`

- [x] 3. Hook auto-issuance into `progressService.markLessonComplete`
  - After updating progress, call `getCourseProgress`; if `percentage === 100`, call `certificateService.autoIssue(userId, courseId)`
  - Derive `courseId` from the lesson record (join `lessons → modules → course_id`)
  - Notification failures must be caught and logged without failing the progress update
  - _Requirements: 1.1, 8.1_

- [x] 4. Add the public verification API endpoint
  - [x] 4.1 Add `GET /api/certificates/verify/:certificateNumber` to `backend/src/routes/certificates.ts`
    - No `authenticate` middleware on this route
    - Call `certificateService.getByNumber`, return 200 with certificate data or 404 with `{ error: "Certificate not found" }`
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]\* 4.2 Write property test for verification round trip
    - **Property 4: Verification round trip**
    - **Validates: Requirements 7.1, 2.1**
    - Use fast-check to generate random certificate data, insert, fetch via verify endpoint, assert all fields match
    - `// Feature: certificate-generation, Property 4: Verification round trip`

  - [ ]\* 4.3 Write property test for unknown certificate returns 404
    - **Property 7: Unknown certificate number returns 404**
    - **Validates: Requirements 7.2, 6.4**
    - Use fast-check to generate random strings not in DB, assert 404 response
    - `// Feature: certificate-generation, Property 7: Unknown certificate number returns 404`

  - [ ]\* 4.4 Write property test for verification URL construction
    - **Property 6: Verification URL construction**
    - **Validates: Requirements 2.3**
    - Use fast-check to generate random certificate numbers, assert `verificationUrl` equals `{BASE_URL}/verify/{certificateNumber}`
    - `// Feature: certificate-generation, Property 6: Verification URL construction`

- [x] 5. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Build the `CertificateTemplate` React component
  - Create `frontend/src/components/CertificateTemplate.tsx`
  - Fixed landscape layout (1056×748px) with: academy logo, decorative header, "Certificate of Completion" heading, student full name, course title, instructor name, issue date, certificate number, QR code (`QRCodeSVG` from `qrcode.react` pointing to `verificationUrl`), and signature line
  - Accept `certificate: CertificateData` and optional `size: 'preview' | 'full'` props
  - Install `qrcode.react` package
  - _Requirements: 3.1–3.9_

- [x] 7. Build the `CertificateModal` component and wire into `CertificatesPage`
  - [x] 7.1 Create `frontend/src/components/CertificateModal.tsx` — full-screen overlay wrapping `CertificateTemplate` with a close button and a Download PDF button
    - _Requirements: 4.2_

  - [x] 7.2 Implement `frontend/src/lib/pdfExporter.ts`
    - Install `html2canvas` and `jspdf` packages
    - `exportCertificatePDF(elementRef, certificateNumber)` — rasterize the template div, embed in A4 landscape PDF, save as `certificate-{certificateNumber}.pdf`
    - On error, throw so the caller can display a toast
    - _Requirements: 5.1, 5.3, 5.4_

  - [x] 7.3 Update `frontend/src/pages/CertificatesPage.tsx`
    - Add `certificatesAPI.verify` method to `api.ts` calling `GET /api/certificates/verify/:certificateNumber`
    - Add "View" button per card that opens `CertificateModal` with the selected certificate
    - Wire the existing "Download PDF" button to `pdfExporter.exportCertificatePDF`
    - Show error toast if PDF export fails
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.4_

  - [ ]\* 7.4 Write property test for PDF filename
    - **Property — PDF filename format**
    - **Validates: Requirements 5.3**
    - Use fast-check to generate random certificate numbers, assert `jsPDF.save` is called with `certificate-{certificateNumber}.pdf`
    - `// Feature: certificate-generation, Property: PDF filename format`

- [x] 8. Build the public `VerifyPage`
  - Create `frontend/src/pages/VerifyPage.tsx`
    - Read `:certificateNumber` from URL params
    - Call `certificatesAPI.verify(certificateNumber)`
    - On success: render `CertificateTemplate` in read-only mode with a "✓ Verified" badge
    - On 404/error: render a "Certificate not found" error state with the certificate number shown
  - Register the route `/verify/:certificateNumber` in the React Router config as a public (unauthenticated) route
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check with a minimum of 100 runs each
- The `CertificateTemplate` component is shared between `CertificateModal`, `CertificatesPage`, and `VerifyPage` to guarantee visual consistency
