import { pool } from "../config/db";

export interface CertificateRow {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  instructorName: string;
  issuedAt: string;
  certificateNumber: string;
  verificationUrl: string;
}

interface IssueCertificateResult {
  certificate: CertificateRow;
  alreadyExisted: boolean;
}

function mapRow(row: any): CertificateRow {
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    studentName: row.student_name ?? "",
    courseId: String(row.course_id),
    courseTitle: row.course_title ?? "",
    instructorName: row.instructor_name ?? "",
    issuedAt: row.issued_at,
    certificateNumber: row.certificate_number,
    verificationUrl: row.verification_url ?? "",
  };
}

export async function autoIssue(
  studentId: number,
  courseId: number,
): Promise<IssueCertificateResult> {
  const enrollmentResult = await pool.query(
    `SELECT progress FROM enrollments WHERE user_id = $1 AND course_id = $2`,
    [studentId, courseId],
  );
  if (enrollmentResult.rows.length === 0) {
    throw new Error("Enrollment not found");
  }

  let isComplete = Number(enrollmentResult.rows[0].progress) >= 100;
  if (!isComplete) {
    const lessonProgress = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE p.completed = true)::int AS completed,
              COUNT(l.id)::int AS total
       FROM lessons l
       JOIN modules m ON m.id = l.module_id
       LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = $1
       WHERE m.course_id = $2`,
      [studentId, courseId],
    );
    const { completed, total } = lessonProgress.rows[0];
    isComplete = Number(total) > 0 && Number(completed) === Number(total);
  }
  if (!isComplete) {
    throw new Error("Course is not complete");
  }

  // Check for existing certificate (idempotency)
  const existingResult = await pool.query(
    `SELECT c.*, crs.title as course_title
     FROM certificates c
     JOIN courses crs ON c.course_id = crs.id
     WHERE c.student_id = $1 AND c.course_id = $2`,
    [studentId, courseId],
  );

  if (existingResult.rows.length > 0) {
    return {
      certificate: mapRow(existingResult.rows[0]),
      alreadyExisted: true,
    };
  }

  // Look up course title and instructor name
  const courseResult = await pool.query(
    `SELECT c.title, u.name as instructor_name
     FROM courses c
     JOIN users u ON c.instructor_id = u.id
     WHERE c.id = $1`,
    [courseId],
  );

  if (courseResult.rows.length === 0) {
    throw new Error(`Course ${courseId} not found`);
  }

  const { title: courseTitle, instructor_name: instructorName } =
    courseResult.rows[0];

  // Look up student display name
  const studentResult = await pool.query(
    "SELECT name FROM users WHERE id = $1",
    [studentId],
  );

  if (studentResult.rows.length === 0) {
    throw new Error(`Student ${studentId} not found`);
  }

  const studentName = studentResult.rows[0].name ?? "";

  // Generate unique certificate number: SOTA-{YEAR}-{NNNNN}
  const year = new Date().getFullYear();
  const countResult = await pool.query(
    "SELECT COUNT(*) as count FROM certificates",
  );
  const count = parseInt(countResult.rows[0].count, 10) + 1;
  const certificateNumber = `SOTA-${year}-${String(count).padStart(5, "0")}`;

  // Construct verification URL
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const verificationUrl = `${baseUrl}/verify/${certificateNumber}`;

  // Insert the certificate row
  const insertResult = await pool.query(
    `INSERT INTO certificates
       (student_id, course_id, certificate_number, issued_at, instructor_name, student_name, verification_url)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6)
     RETURNING *`,
    [
      studentId,
      courseId,
      certificateNumber,
      instructorName,
      studentName,
      verificationUrl,
    ],
  );

  const newRow = insertResult.rows[0];

  // Create notification for the student (failures must not break issuance)
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, created_at)
       VALUES ($1, 'certificate', 'Certificate Issued', $2, '/certificates', CURRENT_TIMESTAMP)`,
      [
        studentId,
        `Congratulations! Your certificate for ${courseTitle} is ready.`,
      ],
    );
  } catch (notifError) {
    console.error("Failed to create certificate notification:", notifError);
  }

  return {
    certificate: { ...mapRow(newRow), courseTitle },
    alreadyExisted: false,
  };
}

export async function getByNumber(
  certificateNumber: string,
): Promise<CertificateRow | null> {
  const result = await pool.query(
    `SELECT c.*, crs.title as course_title
     FROM certificates c
     JOIN courses crs ON c.course_id = crs.id
     WHERE c.certificate_number = $1`,
    [certificateNumber],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRow(result.rows[0]);
}
