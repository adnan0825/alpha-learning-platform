/**
 * API Service Layer - Alpha
 * Connects to Express.js + PostgreSQL backend
 * NO MOCK DATA - All data is fetched from the backend
 */

/**
 * Default `/api` (same origin): dev server proxies to the real API (see vite.config.ts) so the browser never cross-origin calls production — avoids CORS during local dev.
 * Override with VITE_API_URL (e.g. http://localhost:3000/api for a local backend without proxy).
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

// ============ TYPES ============
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: "student" | "instructor" | "admin";
  photoURL?: string;
  bio?: string;
  createdAt: string;
}

export interface CourseData {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  /** YouTube (etc.) URL — always free to watch; separate from card thumbnail. */
  introVideoUrl?: string;
  introVideoTitle?: string;
  videoLinks: VideoLesson[];
  totalVideos: number;
  instructorId: string;
  instructorName: string;
  enrolledCount: number;
  status: "published" | "draft" | "archived";
  difficulty: "beginner" | "intermediate" | "advanced";
  duration: string;
  price: number;
  createdAt: string;
}

export interface VideoLesson {
  title: string;
  url: string;
  duration?: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  progress: number;
  completedVideos: string[];
  enrolledAt: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  questions: QuizQuestion[];
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface QuizResult {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  total: number;
  answers: number[];
  submittedAt: string;
}

export interface Certificate {
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

export interface Discussion {
  id: string;
  courseId: string;
  lessonIndex: number;
  userId: string;
  userName: string;
  userRole: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  replies?: Discussion[];
}

// New types for additional features
export interface Bookmark {
  id: string;
  userId: string;
  courseId: string;
  title: string;
  description: string;
  thumbnail: string;
  category: string;
  difficulty: string;
  instructorName: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type:
    | "info"
    | "success"
    | "warning"
    | "error"
    | "course"
    | "quiz"
    | "certificate";
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface UserFeedbackItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string | null;
  message: string;
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export interface CourseNote {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  lessonIndex?: number;
  lessonTitle?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  instructorId: string;
  courseId: string;
  title: string;
  content: string;
  isPinned: boolean;
  instructorName: string;
  instructorAvatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  courseCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  coursesEnrolled: number;
  coursesCompleted: number;
  lessonsCompleted: number;
  certificatesEarned: number;
  averageRating?: number;
  reviewsGiven: number;
}

// ============ API HELPER ============
type ApiCallOptions = RequestInit & { skipAuth?: boolean };

async function apiCall<T>(
  endpoint: string,
  options?: ApiCallOptions,
): Promise<T> {
  const skipAuth = options?.skipAuth === true;
  const { skipAuth: _omit, ...fetchOptions } = options || {};
  const token = skipAuth ? null : localStorage.getItem("alpha_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `API Error: ${res.status}`);
  }
  return res.json();
}

// ============ AUTH API ============
export const authAPI = {
  async login(
    email: string,
    password: string,
  ): Promise<{ user: UserProfile; token: string }> {
    return apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
  },

  async signup(
    email: string,
    password: string,
    name: string,
    role: UserProfile["role"],
  ): Promise<{ user: UserProfile; token: string }> {
    return apiCall("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name, role }),
      skipAuth: true,
    });
  },

  /** `credential` is the JWT from Google Identity Services (GoogleLogin onSuccess). */
  async loginWithGoogle(
    credential: string,
  ): Promise<{ user: UserProfile; token: string }> {
    return apiCall("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
      skipAuth: true,
    });
  },

  /** Authorization code from `/oauth/google/callback` (redirect flow). `redirectUri` must match the request to Google exactly. */
  async loginWithGoogleCode(
    code: string,
    redirectUri: string,
  ): Promise<{ user: UserProfile; token: string }> {
    return apiCall("/auth/google/code", {
      method: "POST",
      body: JSON.stringify({ code, redirectUri }),
      skipAuth: true,
    });
  },

  async getProfile(): Promise<UserProfile> {
    return apiCall("/auth/profile");
  },

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    return apiCall("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};

// ============ USERS API ============
export const usersAPI = {
  async getAll(): Promise<UserProfile[]> {
    return apiCall("/users");
  },
  async getById(id: string): Promise<UserProfile> {
    return apiCall(`/users/${id}`);
  },
  async update(id: string, data: Partial<UserProfile>): Promise<UserProfile> {
    return apiCall(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async delete(id: string): Promise<void> {
    await apiCall(`/users/${id}`, { method: "DELETE" });
  },
  async getInstructors(): Promise<UserProfile[]> {
    return apiCall("/auth/instructors");
  },
};

/** PUT body uses PostgreSQL column names so proxies / legacy servers never turn camelCase keys into invalid columns (e.g. introVideoUrl → introvideourl). */
function courseUpdateToSnakeBody(
  data: Partial<CourseData>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (data.title !== undefined) out.title = data.title;
  if (data.description !== undefined) out.description = data.description;
  if (data.category !== undefined) out.category = data.category;
  if (data.thumbnail !== undefined) out.thumbnail = data.thumbnail;
  if (data.difficulty !== undefined) out.difficulty = data.difficulty;
  if (data.duration !== undefined) out.duration = data.duration;
  if (data.price !== undefined) out.price = data.price;
  if (data.status !== undefined) out.status = data.status;
  if (data.videoLinks !== undefined) out.video_links = data.videoLinks;
  if (data.totalVideos !== undefined) out.total_videos = data.totalVideos;
  if (data.introVideoUrl !== undefined)
    out.intro_video_url = data.introVideoUrl;
  if (data.introVideoTitle !== undefined)
    out.intro_video_title = data.introVideoTitle;
  return out;
}

// ============ COURSES API ============
export const coursesAPI = {
  async getPublished(): Promise<CourseData[]> {
    return apiCall("/courses?published=true");
  },
  async getAll(): Promise<CourseData[]> {
    return apiCall("/courses");
  },
  async getById(id: string): Promise<CourseData> {
    return apiCall(`/courses/${id}`);
  },
  async getByInstructor(instructorId: string): Promise<CourseData[]> {
    return apiCall(`/courses/instructor/${instructorId}`);
  },
  async create(
    course: Omit<CourseData, "id" | "createdAt" | "enrolledCount">,
  ): Promise<CourseData> {
    return apiCall("/courses", {
      method: "POST",
      body: JSON.stringify(course),
    });
  },
  async update(id: string, data: Partial<CourseData>): Promise<CourseData> {
    return apiCall(`/courses/${id}`, {
      method: "PUT",
      body: JSON.stringify(courseUpdateToSnakeBody(data)),
    });
  },
  async delete(id: string): Promise<void> {
    await apiCall(`/courses/${id}`, { method: "DELETE" });
  },
  async getModules(courseId: string): Promise<any[]> {
    return apiCall(`/courses/${courseId}/modules`);
  },
};

// ============ ENROLLMENTS API ============
export const enrollmentsAPI = {
  async getMyCourses(): Promise<Enrollment[]> {
    return apiCall("/enrollments/my-courses");
  },
  async getByStudent(studentId: string): Promise<Enrollment[]> {
    return apiCall(`/enrollments/student/${studentId}`);
  },
  async enroll(courseId: string): Promise<Enrollment> {
    return apiCall(`/enrollments/enroll/${courseId}`, { method: "POST" });
  },
  async checkEnrollment(courseId: string): Promise<{ enrolled: boolean }> {
    return apiCall(`/enrollments/course/${courseId}/check`);
  },
  async getCourseEnrollments(courseId: string): Promise<any[]> {
    return apiCall(`/enrollments/course/${courseId}/enrollments`);
  },
  async createReview(
    courseId: string,
    rating: number,
    comment?: string,
  ): Promise<any> {
    return apiCall(`/enrollments/course/${courseId}/review`, {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    });
  },
  async getCourseReviews(courseId: string): Promise<any[]> {
    return apiCall(`/enrollments/course/${courseId}/reviews`);
  },
  async getCourseRating(
    courseId: string,
  ): Promise<{ avg_rating: number; review_count: number }> {
    return apiCall(`/enrollments/course/${courseId}/rating`);
  },
};

// ============ PROGRESS API ============
export const progressAPI = {
  async completeLesson(lessonId: string): Promise<any> {
    return apiCall(`/progress/lesson/${lessonId}/complete`, { method: "POST" });
  },
  async incompleteLesson(lessonId: string): Promise<any> {
    return apiCall(`/progress/lesson/${lessonId}/incomplete`, {
      method: "POST",
    });
  },
  async getCourseProgress(courseId: string): Promise<any> {
    return apiCall(`/progress/course/${courseId}`);
  },
  async getLessonStatus(lessonId: string): Promise<{ completed: boolean }> {
    return apiCall(`/progress/lesson/${lessonId}`);
  },
};

// ============ QUIZZES API ============
export const quizzesAPI = {
  async getByCourse(courseId: string): Promise<Quiz[]> {
    return apiCall(`/quizzes/course/${courseId}`);
  },
  async create(quiz: Omit<Quiz, "id" | "createdAt">): Promise<Quiz> {
    return apiCall("/quizzes", {
      method: "POST",
      body: JSON.stringify(quiz),
    });
  },
  async submit(quizId: string, answers: number[]): Promise<QuizResult> {
    return apiCall(`/quizzes/${quizId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  },
  async getResults(
    quizId: string,
    studentId: string,
  ): Promise<QuizResult | null> {
    return apiCall(`/quizzes/${quizId}/results/${studentId}`);
  },
};

// ============ CERTIFICATES API ============
export const certificatesAPI = {
  async getByStudent(studentId: string): Promise<Certificate[]> {
    return apiCall(`/certificates/student/${studentId}`);
  },
  async issue(studentId: string, courseId: string): Promise<Certificate> {
    return apiCall("/certificates", {
      method: "POST",
      body: JSON.stringify({ studentId, courseId }),
    });
  },
  async verify(certificateNumber: string): Promise<Certificate> {
    return apiCall(`/certificates/verify/${certificateNumber}`);
  },
};

// ============ DISCUSSIONS API ============
export const discussionsAPI = {
  async getByCourse(courseId: string): Promise<Discussion[]> {
    const all = await apiCall<Discussion[]>(`/discussions/course/${courseId}`);
    // Build tree: top-level with nested replies
    const topLevel = all.filter((d) => !d.parentId);
    return topLevel.map((d) => ({
      ...d,
      replies: Array.isArray(d.replies)
        ? d.replies
        : all.filter((r) => r.parentId === d.id),
    }));
  },
  async post(data: {
    courseId: string;
    lessonIndex: number;
    content: string;
    parentId?: string;
  }): Promise<Discussion> {
    return apiCall("/discussions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async reply(discussionId: string, content: string): Promise<Discussion> {
    return apiCall(`/discussions/${discussionId}/replies`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },
};

// ============ UPLOADS API ============
export const uploadsAPI = {
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("image", file);

    const token = localStorage.getItem("alpha_token");
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/uploads/image`, {
      method: "POST",
      body: formData,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || `Upload failed: ${res.status}`);
    }
    return res.json();
  },
};

// ============ ANALYTICS API (Admin) ============
export const analyticsAPI = {
  async getPlatformStats(): Promise<any> {
    return apiCall("/analytics/platform");
  },
  async getGrowthTrends(): Promise<
    Array<{ month: string; users: number; enrollments: number }>
  > {
    return apiCall("/analytics/growth-trends");
  },
  async getCategoryDistribution(): Promise<
    Array<{ name: string; value: number }>
  > {
    return apiCall("/analytics/category-distribution");
  },
};

// ============ PAYMENTS API (Chapa) ============
export const paymentsAPI = {
  async initializePayment(
    amount: number,
    courseId: string,
    courseTitle: string,
    phoneNumber: string,
  ): Promise<{ checkout_url: string; tx_ref: string }> {
    return apiCall("/payments/initialize", {
      method: "POST",
      body: JSON.stringify({
        amount,
        courseId,
        courseTitle,
        phone_number: phoneNumber,
      }),
    });
  },

  async verifyPayment(txRef: string): Promise<any> {
    return apiCall(`/payments/verify/${txRef}`);
  },

  async getMyPayments(): Promise<
    Array<{
      id: string;
      tx_ref: string;
      amount: number;
      currency: string;
      status: string;
      course_title: string;
      created_at: string;
      completed_at?: string;
    }>
  > {
    return apiCall("/payments/my-payments");
  },

  async getBanks(): Promise<Array<{ bank_code: string; bank_name: string }>> {
    return apiCall("/payments/banks");
  },

  async submitManualReceipt(data: {
    courseId: string;
    receiptUrl: string;
    amountEtb?: number;
    note?: string;
  }): Promise<{ success: boolean; id: number; created_at: string }> {
    return apiCall("/payments/manual-receipt", {
      method: "POST",
      body: JSON.stringify({
        courseId: data.courseId,
        receiptUrl: data.receiptUrl,
        amountEtb: data.amountEtb,
        note: data.note,
      }),
    });
  },

  async getMyReceipts(): Promise<
    Array<{
      id: number;
      receipt_image_url: string;
      amount_etb: number | null;
      note: string | null;
      status: string;
      created_at: string;
      reviewed_at: string | null;
      course_title: string;
      course_id: number;
    }>
  > {
    return apiCall("/payments/my-receipts");
  },

  /** Admin: all payments (joined user + course). */
  async getAllPayments(): Promise<
    Array<{
      id: number;
      tx_ref: string;
      amount: number;
      currency: string;
      status: string;
      user_name: string;
      user_email: string;
      course_title: string;
      created_at: string;
      completed_at?: string;
    }>
  > {
    return apiCall("/admin/payments");
  },

  async getPaymentStats(): Promise<{
    total_payments: string;
    total_amount: string;
    completed_count: string;
    pending_count: string;
    failed_count: string;
    completed_amount: string;
    average_amount: string;
  }> {
    return apiCall("/admin/payments/stats");
  },

  /** Admin: manual transfer receipts (screenshots). */
  async getAdminManualReceipts(): Promise<
    Array<{
      id: number;
      receipt_image_url: string;
      amount_etb: string | null;
      note: string | null;
      status?: string | null;
      created_at: string;
      reviewed_at?: string | null;
      reviewed_by_name?: string | null;
      user_name: string;
      user_email: string;
      course_title: string;
      course_id: number;
    }>
  > {
    return apiCall("/admin/manual-receipts");
  },

  /** Admin: approve a manual receipt and enroll the student. */
  async approveManualReceipt(
    id: number,
  ): Promise<{ success: boolean; enrolled: boolean }> {
    return apiCall("/admin/manual-receipts/approve", {
      method: "POST",
      body: JSON.stringify({ receiptId: id }),
    });
  },

  async deleteManualReceipt(
    id: number,
  ): Promise<{ success: boolean; removed?: boolean }> {
    return apiCall("/admin/manual-receipts/remove", {
      method: "POST",
      body: JSON.stringify({ receiptId: id }),
    });
  },
};

// ============ BOOKMARKS API ============
export const bookmarksAPI = {
  async getMyBookmarks(): Promise<Bookmark[]> {
    return apiCall("/analytics/bookmarks");
  },
  async add(courseId: string): Promise<any> {
    return apiCall(`/analytics/bookmarks/${courseId}`, { method: "POST" });
  },
  async remove(courseId: string): Promise<any> {
    return apiCall(`/analytics/bookmarks/${courseId}`, { method: "DELETE" });
  },
  async check(courseId: string): Promise<{ isBookmarked: boolean }> {
    return apiCall(`/analytics/bookmarks/${courseId}/check`);
  },
};

/** Maps DB/API snake_case notification rows to the shape the UI expects. */
function normalizeNotificationRow(row: Record<string, unknown>): Notification {
  const rawCreated = row.createdAt ?? row.created_at;
  let createdAt = "";
  if (rawCreated != null) {
    if (typeof rawCreated === "string") {
      createdAt = rawCreated;
    } else if (rawCreated instanceof Date) {
      createdAt = rawCreated.toISOString();
    } else {
      const d = new Date(rawCreated as string | number);
      createdAt = Number.isNaN(d.getTime()) ? "" : d.toISOString();
    }
  }
  const t = row.type;
  const type: Notification["type"] =
    t === "success" ||
    t === "warning" ||
    t === "error" ||
    t === "course" ||
    t === "quiz" ||
    t === "certificate"
      ? t
      : "info";
  return {
    id: String(row.id ?? ""),
    userId: String(row.userId ?? row.user_id ?? ""),
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    type,
    read: Boolean(row.read),
    link: row.link != null && row.link !== "" ? String(row.link) : undefined,
    createdAt,
  };
}

// ============ NOTIFICATIONS API ============
export const notificationsAPI = {
  async getAll(): Promise<Notification[]> {
    const rows = await apiCall<Record<string, unknown>[]>(
      "/analytics/notifications",
    );
    return Array.isArray(rows) ? rows.map(normalizeNotificationRow) : [];
  },
  async getUnread(): Promise<Notification[]> {
    const rows = await apiCall<Record<string, unknown>[]>(
      "/analytics/notifications?unread=true",
    );
    return Array.isArray(rows) ? rows.map(normalizeNotificationRow) : [];
  },
  async getCount(): Promise<{ count: number }> {
    return apiCall("/analytics/notifications/count");
  },
  async markAsRead(notificationId: string): Promise<Notification> {
    const row = await apiCall<Record<string, unknown>>(
      `/analytics/notifications/${notificationId}/read`,
      {
        method: "PUT",
      },
    );
    return normalizeNotificationRow(row);
  },
  async markAllAsRead(): Promise<any> {
    return apiCall("/analytics/notifications/read-all", { method: "PUT" });
  },
  async delete(notificationId: string): Promise<any> {
    return apiCall(`/analytics/notifications/${notificationId}`, {
      method: "DELETE",
    });
  },
};

// ============ FEEDBACK (questions to admins; auth required) ============
export const feedbackAPI = {
  async submit(
    subject: string | undefined,
    message: string,
  ): Promise<{ id: string }> {
    return apiCall("/feedback", {
      method: "POST",
      body: JSON.stringify({ subject: subject?.trim() || undefined, message }),
    });
  },
};

// ============ COURSE NOTES API ============
export const notesAPI = {
  async getAll(courseId?: string): Promise<CourseNote[]> {
    const query = courseId ? `?courseId=${courseId}` : "";
    return apiCall(`/analytics/notes${query}`);
  },
  async create(
    courseId: string,
    content: string,
    lessonIndex?: number,
    lessonTitle?: string,
  ): Promise<CourseNote> {
    return apiCall("/analytics/notes", {
      method: "POST",
      body: JSON.stringify({ courseId, content, lessonIndex, lessonTitle }),
    });
  },
  async update(noteId: string, content: string): Promise<CourseNote> {
    return apiCall(`/analytics/notes/${noteId}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  },
  async delete(noteId: string): Promise<any> {
    return apiCall(`/analytics/notes/${noteId}`, { method: "DELETE" });
  },
};

// ============ ANNOUNCEMENTS API ============
export const announcementsAPI = {
  async getByCourse(courseId: string): Promise<Announcement[]> {
    return apiCall(`/analytics/announcements/course/${courseId}`);
  },
  async create(
    courseId: string,
    title: string,
    content: string,
    isPinned?: boolean,
  ): Promise<Announcement> {
    return apiCall("/analytics/announcements", {
      method: "POST",
      body: JSON.stringify({ courseId, title, content, isPinned }),
    });
  },
  async update(
    announcementId: string,
    data: Partial<{ title: string; content: string; isPinned: boolean }>,
  ): Promise<Announcement> {
    return apiCall(`/analytics/announcements/${announcementId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async delete(announcementId: string): Promise<any> {
    return apiCall(`/analytics/announcements/${announcementId}`, {
      method: "DELETE",
    });
  },
};

// ============ ASSIGNMENTS API ============
export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: string;
  points: number;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  fileUrl?: string;
  content?: string;
  grade?: number;
  feedback?: string;
  status: "pending" | "graded";
}

export const assignmentsAPI = {
  // Mock implementations for now
  async getByCourse(courseId: string): Promise<Assignment[]> {
    return [
      {
        id: "1",
        courseId,
        title: "Final Project Proposal",
        description: "Submit a PDF outlining your project.",
        dueDate: "2025-04-10",
        points: 100,
      },
      {
        id: "2",
        courseId,
        title: "React Component Library",
        description: "Build 5 reusable components.",
        dueDate: "2025-04-20",
        points: 50,
      },
    ];
  },
  async getStudentSubmissions(studentId: string): Promise<Submission[]> {
    return [
      {
        id: "s1",
        assignmentId: "1",
        studentId,
        studentName: "You",
        submittedAt: "2025-04-01",
        status: "graded",
        grade: 95,
        feedback: "Great work!",
      },
    ];
  },
  async submit(
    assignmentId: string,
    content: string,
    file?: File,
  ): Promise<Submission> {
    // Mock submission
    return {
      id: `s-${Date.now()}`,
      assignmentId,
      studentId: "current-user",
      studentName: "Current User",
      submittedAt: new Date().toISOString(),
      content,
      status: "pending",
    };
  },
  async getSubmissionsForInstructor(courseId: string): Promise<Submission[]> {
    return [
      {
        id: "s1",
        assignmentId: "1",
        studentId: "u2",
        studentName: "Alice Johnson",
        submittedAt: "2025-04-02",
        content: "Here is my proposal...",
        status: "pending",
      },
      {
        id: "s2",
        assignmentId: "1",
        studentId: "u3",
        studentName: "Bob Smith",
        submittedAt: "2025-04-03",
        content: "Project link attached.",
        status: "graded",
        grade: 88,
      },
    ];
  },
  async gradeSubmission(
    submissionId: string,
    grade: number,
    feedback: string,
  ): Promise<void> {
    console.log(`Graded submission ${submissionId}: ${grade}`);
  },
};

// ============ COUPONS API ============
export interface Coupon {
  id: string;
  code: string;
  discount: number; // Percentage
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
}

export const couponsAPI = {
  async getAll(): Promise<Coupon[]> {
    return [
      {
        id: "c1",
        code: "WELCOME20",
        discount: 20,
        expiryDate: "2025-12-31",
        usageLimit: 100,
        usedCount: 45,
      },
      {
        id: "c2",
        code: "SUMMERSALE",
        discount: 50,
        expiryDate: "2025-06-01",
        usageLimit: 500,
        usedCount: 12,
      },
    ];
  },
  async create(
    code: string,
    discount: number,
    expiryDate: string,
    usageLimit: number,
  ): Promise<Coupon> {
    return {
      id: `c-${Date.now()}`,
      code,
      discount,
      expiryDate,
      usageLimit,
      usedCount: 0,
    };
  },
  async delete(id: string): Promise<void> {
    console.log(`Deleted coupon ${id}`);
  },
};

// ============ LEARNING PATHS API ============
export const learningPathsAPI = {
  async getAll(): Promise<LearningPath[]> {
    return apiCall("/analytics/learning-paths");
  },
  async getById(id: string): Promise<LearningPath> {
    return apiCall(`/analytics/learning-paths/${id}`);
  },
  async getCourses(id: string): Promise<CourseData[]> {
    return apiCall(`/analytics/learning-paths/${id}/courses`);
  },
  async enroll(pathId: string): Promise<any> {
    return apiCall(`/analytics/user/learning-paths/${pathId}`, {
      method: "POST",
    });
  },
  async getMyPaths(): Promise<any[]> {
    return apiCall("/analytics/user/learning-paths");
  },
  async updateProgress(pathId: string, progress: number): Promise<any> {
    return apiCall(`/analytics/user/learning-paths/${pathId}/progress`, {
      method: "PUT",
      body: JSON.stringify({ progress }),
    });
  },
};

// ============ LEADERBOARD API ============
export const leaderboardAPI = {
  async get(limit?: number): Promise<LeaderboardEntry[]> {
    const query = limit ? `?limit=${limit}` : "";
    return apiCall(`/analytics/leaderboard${query}`);
  },
};

// ============ INSTRUCTOR ANALYTICS API ============
export const instructorAnalyticsAPI = {
  async getRevenue(courseId?: string): Promise<any[]> {
    const query = courseId ? `?courseId=${courseId}` : "";
    return apiCall(`/analytics/instructor/revenue${query}`);
  },
  async getStats(): Promise<any> {
    return apiCall("/analytics/instructor/stats");
  },
  async getQuizStats(courseId: string): Promise<any[]> {
    return apiCall(`/analytics/instructor/quiz-stats/${courseId}`);
  },
  async getGrades(courseId: string): Promise<any[]> {
    return apiCall(`/analytics/instructor/grades/${courseId}`);
  },
};

// ============= SETTINGS API ============
export type FaqItem = { id: string; question: string; answer: string };

export const settingsAPI = {
  async getAppearance(): Promise<any> {
    return apiCall("/settings/appearance");
  },
  async updateAppearance(data: any): Promise<any> {
    return apiCall("/settings/appearance", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async getFaq(): Promise<{ items: FaqItem[] }> {
    return apiCall("/settings/faq");
  },
  async getTranslations(): Promise<{
    entries: Record<string, { en?: string; om?: string }>;
  }> {
    return apiCall("/settings/translations");
  },
  async updateTranslations(
    entries: Record<string, { en: string; om: string }>,
  ): Promise<{ message: string }> {
    return apiCall("/settings/translations", {
      method: "PUT",
      body: JSON.stringify({ entries }),
    });
  },
};

// ============= ADMIN API ============
export const adminAPI = {
  async getSettings(): Promise<any> {
    return apiCall("/admin/settings");
  },
  async updateSettings(data: any): Promise<any> {
    return apiCall("/admin/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async getLogs(limit?: number): Promise<any[]> {
    const query = limit ? `?limit=${limit}` : "";
    return apiCall(`/admin/logs${query}`);
  },
  async getOverviewReport(period?: number): Promise<any> {
    const query = period ? `?period=${period}` : "";
    return apiCall(`/admin/reports/overview${query}`);
  },
  async getUsersReport(): Promise<any[]> {
    return apiCall("/admin/reports/users");
  },
  async getCoursesReport(): Promise<any[]> {
    return apiCall("/admin/reports/courses");
  },
  async getDiscussions(limit?: number): Promise<any[]> {
    const query = limit ? `?limit=${limit}` : "";
    return apiCall(`/admin/moderation/discussions${query}`);
  },
  async deleteDiscussion(id: string): Promise<any> {
    return apiCall(`/admin/moderation/discussions/${id}`, { method: "DELETE" });
  },
  async getReviews(): Promise<any[]> {
    return apiCall("/admin/moderation/reviews");
  },
  async deleteReview(id: string): Promise<any> {
    return apiCall(`/admin/moderation/reviews/${id}`, { method: "DELETE" });
  },
  async getPayments(status?: string, limit?: number): Promise<any[]> {
    let query = "?";
    const params: string[] = [];
    if (status) params.push(`status=${status}`);
    if (limit) params.push(`limit=${limit}`);
    return apiCall(`/admin/payments${query}${params.join("&")}`);
  },
  async getPaymentStats(): Promise<any> {
    return apiCall("/admin/payments/stats");
  },
  async getAdminManualReceipts(): Promise<any[]> {
    return apiCall("/admin/manual-receipts");
  },
  async listFeedback(): Promise<UserFeedbackItem[]> {
    return apiCall("/admin/feedback");
  },
  async replyFeedback(id: string, reply: string): Promise<UserFeedbackItem> {
    return apiCall(`/admin/feedback/${id}/reply`, {
      method: "PATCH",
      body: JSON.stringify({ reply }),
    });
  },
  async deleteFeedback(id: string): Promise<{ success: boolean }> {
    return apiCall(`/admin/feedback/${id}`, { method: "DELETE" });
  },
};
