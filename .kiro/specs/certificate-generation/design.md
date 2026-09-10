# Design Document: Certificate Generation

## Overview

This feature extends the existing Alpha LMS to automatically generate, display, download, and publicly verify certificates when a student completes 100% of a course.

The implementation touches three layers:

- **Backend**: Auto-trigger certificate issuance inside `progressService.markLessonComplete`, extend the certificates table, add a public verification endpoint, and fire a notification.
- **Frontend**: A `CertificateTemplate` React component that renders the visual certificate, integrated into `CertificatesPage` with a modal viewer and PDF download, plus a new public `VerifyPage`.
- **Routing**: A new public route `/verify/:certificateNumber` added to the React Router config.

Key library choices:

- **QR code**: `qrcode.react` — lightweight React component, renders as SVG, well-maintained ([npmjs.com](https://www.npmjs.com/package/qrcode.react)).
- **PDF export**: `html2canvas` + `jsPDF` — captures the rendered DOM node as a canvas image and embeds it into a PDF. This preserves the exact visual design including the QR code and logo without requiring a separate PDF layout engine.

---

## Architecture

```mermaid
flowchart TD
    A[Student marks last lesson complete] --> B[progressService.markLessonComplete]
    B --> C{Course 100% complete?}
    C -- No --> D[Return progress]
    C -- Yes --> E[certificateService.autoIssue]
    E --> F{Certificate already exists?}
    F -- Yes --> G[Return existing certificate]
    F -- No --> H[Insert certificate row]
    H --> I[Create notification for student]
    I --> D

    subgraph Frontend
        J[CertificatesPage] --> K[certificatesAPI.getByStudent]
        K --> L[Certificate card list]
        L --> M[View button → CertificateModal]
        M --> N[CertificateTemplate component]
        N --> O[QRCodeSVG from qrcode.react]
        L --> P[Download button → pdfExporter]
        P --> Q[html2canvas + jsPDF]
    end

    subgraph Public
        R[/verify/:certNumber] --> S[VerifyPage]
        S --> T[GET /api/certificates/verify/:certNumber]
        T --> U[CertificateTemplate read-only view]
    end
```

---

## Components and Interfaces

### Backend

#### `certificateService.ts` (new)

```typescript
interface IssueCertificateResult {
  certificate: CertificateRow;
  alreadyExisted: boolean;
}

autoIssue(studentId: number, courseId: number): Promise<IssueCertificateResult>
getByNumber(certificateNumber: string): Promise<CertificateRow | null>
```

#### Extended `certificates` route

| Method | Path                                          | Auth     | Description                       |
| ------ | --------------------------------------------- | -------- | --------------------------------- |
| GET    | `/api/certificates/student/:studentId`        | Required | Existing — student's certificates |
| POST   | `/api/certificates`                           | Required | Existing — manual issue           |
| GET    | `/api/certificates/verify/:certificateNumber` | None     | New — public verification lookup  |

#### `progressService.markLessonComplete` (modified)

After updating progress, call `getCourseProgress`. If `percentage === 100`, call `certificateService.autoIssue`.

---

### Frontend

#### `CertificateTemplate` component

```
Props:
  certificate: CertificateData   // all fields needed to render
  size?: 'preview' | 'full'      // controls scaling
```

Renders a fixed-size `div` (landscape, 1056×748px at 96dpi ≈ A4 landscape) containing:

- Academy logo (top-left)
- Decorative border/header
- "Certificate of Completion" heading
- Student full name (large, prominent)
- Course title
- Instructor name
- Issue date
- Certificate number
- QR code (bottom-right, links to `/verify/{certificateNumber}`)
- Signature line

#### `CertificateModal` component

Wraps `CertificateTemplate` in a full-screen modal overlay with a close button and a Download PDF button.

#### `pdfExporter.ts` utility

```typescript
exportCertificatePDF(elementRef: RefObject<HTMLDivElement>, certificateNumber: string): Promise<void>
```

Uses `html2canvas` to rasterize the `CertificateTemplate` DOM node, then `jsPDF` to embed the image into an A4 landscape PDF and trigger browser download.

#### `VerifyPage` component (new page)

- Route: `/verify/:certificateNumber`
- No auth required
- Calls `GET /api/certificates/verify/:certificateNumber`
- On success: renders `CertificateTemplate` in read-only mode with a "✓ Verified" badge
- On 404: renders a "Certificate not found" error state

#### Updated `CertificatesPage`

- Adds a "View" button per certificate card that opens `CertificateModal`
- Wires the existing "Download PDF" button to `pdfExporter`

#### Updated `certificatesAPI`

```typescript
// New method added to certificatesAPI
verify(certificateNumber: string): Promise<CertificateData>
```

---

## Data Models

### Database: `certificates` table (extended)

```sql
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS instructor_name TEXT,
  ADD COLUMN IF NOT EXISTS student_name    TEXT,
  ADD COLUMN IF NOT EXISTS verification_url TEXT;
```

The existing columns (`id`, `student_id`, `course_id`, `certificate_number`, `issued_at`) are preserved. The new columns are populated at insert time so the certificate is self-contained.

### TypeScript: `CertificateData` interface (extended)

```typescript
export interface CertificateData {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  instructorName: string;
  issuedAt: string; // ISO 8601
  certificateNumber: string; // e.g. SOTA-2025-00042
  verificationUrl: string; // e.g. https://academy.com/verify/SOTA-2025-00042
}
```

The existing `Certificate` interface in `api.ts` will be updated to match (adding `instructorName` and `verificationUrl`).

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

Property-based testing (PBT) validates software correctness by testing universal properties across many generated inputs. Each property is a formal specification that should hold for all valid inputs.

The PBT library used is **fast-check** (TypeScript/JavaScript), configured with a minimum of 100 runs per property.

---

Property 1: No duplicate certificates
_For any_ student ID and course ID, calling `autoIssue` multiple times should always return the same certificate number and never insert more than one certificate row for that (student, course) pair.
**Validates: Requirements 1.4**

---

Property 2: Certificate number format invariant
_For any_ issued certificate, the `certificateNumber` field must match the pattern `SOTA-{4-digit year}-{5-digit zero-padded number}`.
**Validates: Requirements 1.2**

---

Property 3: Auto-issue only at 100% completion
_For any_ student and course where the completion percentage is less than 100, calling `autoIssue` should not create a certificate row.
**Validates: Requirements 1.5**

---

Property 4: Verification round trip
_For any_ issued certificate, looking it up via `GET /api/certificates/verify/{certificateNumber}` should return an object whose fields match the original certificate exactly (student name, course title, instructor name, issue date, certificate number).
**Validates: Requirements 7.1, 2.1**

---

Property 5: Certificate data completeness
_For any_ issued certificate, all required fields (studentName, courseTitle, instructorName, issuedAt, certificateNumber, verificationUrl) must be non-empty strings.
**Validates: Requirements 2.1, 2.2, 2.3**

---

Property 6: Verification URL construction
_For any_ certificate, the `verificationUrl` must equal `{BASE_URL}/verify/{certificateNumber}` where `certificateNumber` is the certificate's own number.
**Validates: Requirements 2.3**

---

Property 7: Unknown certificate number returns 404
_For any_ string that is not a valid certificate number in the database, `GET /api/certificates/verify/{string}` should return a 404 response.
**Validates: Requirements 7.2**

---

Property 8: Notification issued on certificate creation
_For any_ newly issued certificate, a notification row must exist for the student with type "certificate" and a message containing the course title.
**Validates: Requirements 8.1, 8.2**

---

## Error Handling

| Scenario                                           | Handling                                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `autoIssue` called when certificate already exists | Return existing certificate, `alreadyExisted: true`, no duplicate insert                |
| `autoIssue` called when enrollment not found       | Throw `EnrollmentNotFoundError`, log server-side, no certificate created                |
| `autoIssue` called when course < 100% complete     | Return `null`, no certificate created                                                   |
| Verification endpoint receives unknown cert number | Return HTTP 404 `{ error: "Certificate not found" }`                                    |
| PDF export fails (html2canvas error)               | Catch error, display toast notification to user: "PDF export failed. Please try again." |
| Notification insert fails                          | Log error server-side, do not fail the certificate issuance transaction                 |

---

## Testing Strategy

### Unit Tests

- `certificateService.autoIssue`: test idempotency, test rejection when progress < 100, test correct field population.
- `certificateNumber` generator: test format compliance for various counts and years.
- `VerifyPage`: test "not found" state renders correctly for unknown certificate numbers.
- `pdfExporter`: test that the correct filename is passed to jsPDF save.

### Property-Based Tests (fast-check, min 100 runs each)

Each property test references its design property number via a comment tag:
`// Feature: certificate-generation, Property N: <property text>`

- **Property 1** — No duplicate certificates: generate random (studentId, courseId) pairs, call autoIssue twice, assert count in DB = 1.
- **Property 2** — Certificate number format: generate N certificates, assert all numbers match `/^SOTA-\d{4}-\d{5}$/`.
- **Property 3** — Auto-issue only at 100%: generate random progress values < 100, assert no certificate row created.
- **Property 4** — Verification round trip: generate random certificate data, insert, fetch via verify endpoint, assert field equality.
- **Property 5** — Data completeness: generate random valid (student, course) pairs, issue certificate, assert all required fields are non-empty.
- **Property 6** — Verification URL construction: generate random certificate numbers, assert `verificationUrl` ends with `/verify/{certificateNumber}`.
- **Property 7** — Unknown cert returns 404: generate random strings not in DB, assert 404 response.
- **Property 8** — Notification on issuance: generate random (student, course) pairs, issue certificate, assert notification row exists with correct type and message.

### Integration Tests

- End-to-end: mark all lessons complete for a course → assert certificate row created → assert notification created → assert verify endpoint returns correct data.
- `CertificatesPage`: mock API, assert certificate cards render with correct data.
- `VerifyPage`: mock API, assert valid cert renders template; assert invalid cert renders error state.
