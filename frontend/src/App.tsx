/**
 * App - Root component with routing. Alpha.
 */
import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import FirstVisitLanguageDialog from "@/components/FirstVisitLanguageDialog";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import FloatingContact from "./components/FloatingContact";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const GoogleOAuthCallback = lazy(() => import("./pages/GoogleOAuthCallback"));
const DashboardRouter = lazy(() => import("./pages/DashboardRouter"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const InstructorDashboard = lazy(() => import("./pages/InstructorDashboard"));
const InstructorLearningPaths = lazy(
  () => import("./pages/InstructorLearningPaths"),
);
const InstructorCourses = lazy(() => import("./pages/InstructorCourses"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminCourses = lazy(() => import("./pages/AdminCourses"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminRevenue = lazy(() => import("./pages/AdminRevenue"));
const BrowseCourses = lazy(() => import("./pages/BrowseCourses"));
const MyCourses = lazy(() => import("./pages/MyCourses"));
const CourseView = lazy(() => import("./pages/CourseView"));
const AddCourse = lazy(() => import("./pages/AddCourse"));
const EditCourse = lazy(() => import("./pages/EditCourse"));
const CourseManager = lazy(() => import("./pages/CourseManager"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const CertificatesPage = lazy(() => import("./pages/CertificatesPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const InstructorProgress = lazy(() => import("./pages/InstructorProgress"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const LearningPath = lazy(() => import("./pages/LearningPath"));
const BookmarksPage = lazy(() => import("./pages/BookmarksPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const CourseNotes = lazy(() => import("./pages/CourseNotes"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const QuizManager = lazy(() => import("./pages/QuizManager"));
const StudentGrades = lazy(() => import("./pages/StudentGrades"));
const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage"));
const SystemLogs = lazy(() => import("./pages/SystemLogs"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const ContentModeration = lazy(() => import("./pages/ContentModeration"));
const StudentAssignments = lazy(() => import("./pages/StudentAssignments"));
const StudentCalendar = lazy(() => import("./pages/StudentCalendar"));
const InstructorAssignments = lazy(
  () => import("./pages/InstructorAssignments"),
);
const InstructorRevenue = lazy(() => import("./pages/InstructorRevenue"));
const AdminCoupons = lazy(() => import("./pages/AdminCoupons"));
const AdminAppearance = lazy(() => import("./pages/AdminAppearance"));
const AdminFAQ = lazy(() => import("./pages/AdminFAQ"));
const AdminTranslations = lazy(() => import("./pages/AdminTranslations"));
const NotFound = lazy(() => import("./pages/NotFound"));
const VerifyPage = lazy(() => import("./pages/VerifyPage"));
const AdminManualPayments = lazy(() => import("./pages/AdminManualPayments"));

const loadingFallback = (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-accent" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <FirstVisitLanguageDialog />
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <Suspense fallback={loadingFallback}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route
                  path="/oauth/google/callback"
                  element={<GoogleOAuthCallback />}
                />
                {/* Public course preview — intro / first lesson without login */}
                <Route path="/course/:courseId" element={<CourseView />} />
                {/* Public certificate verification */}
                <Route
                  path="/verify/:certificateNumber"
                  element={<VerifyPage />}
                />

                {/* All authenticated routes share a single Layout instance */}
                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<DashboardRouter />} />

                  {/* Student routes */}
                  <Route
                    path="/student/dashboard"
                    element={<StudentDashboard />}
                  />
                  <Route
                    path="/student/assignments"
                    element={<StudentAssignments />}
                  />
                  <Route
                    path="/student/calendar"
                    element={<StudentCalendar />}
                  />
                  <Route path="/courses" element={<MyCourses />} />
                  <Route path="/my-courses" element={<MyCourses />} />
                  <Route path="/browse" element={<BrowseCourses />} />
                  <Route
                    path="/course/:courseId/quiz/:quizId"
                    element={<QuizPage />}
                  />
                  <Route path="/certificates" element={<CertificatesPage />} />
                  <Route path="/learning-path" element={<LearningPath />} />
                  <Route path="/bookmarks" element={<BookmarksPage />} />
                  <Route
                    path="/notifications"
                    element={<NotificationsPage />}
                  />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/notes" element={<CourseNotes />} />
                  <Route path="/help" element={<HelpCenter />} />

                  {/* Shared routes */}
                  <Route path="/profile" element={<ProfilePage />} />

                  {/* Instructor routes */}
                  <Route path="/instructor" element={<InstructorDashboard />} />
                  <Route
                    path="/instructor/dashboard"
                    element={<InstructorDashboard />}
                  />
                  <Route
                    path="/instructor/courses"
                    element={<InstructorCourses />}
                  />
                  <Route
                    path="/instructor/courses/:courseId"
                    element={<CourseManager />}
                  />
                  <Route
                    path="/instructor/courses/:courseId/edit"
                    element={<EditCourse />}
                  />
                  <Route
                    path="/instructor/courses/:courseId/manager"
                    element={<CourseManager />}
                  />
                  <Route
                    path="/instructor/add-course"
                    element={<AddCourse />}
                  />
                  <Route
                    path="/instructor/learning-paths"
                    element={<InstructorLearningPaths />}
                  />
                  <Route
                    path="/instructor/progress"
                    element={<InstructorProgress />}
                  />
                  <Route path="/instructor/quizzes" element={<QuizManager />} />
                  <Route
                    path="/instructor/grades"
                    element={<StudentGrades />}
                  />
                  <Route
                    path="/instructor/assignments"
                    element={<InstructorAssignments />}
                  />
                  <Route
                    path="/instructor/revenue"
                    element={<InstructorRevenue />}
                  />
                  <Route
                    path="/instructor/announcements"
                    element={<AnnouncementsPage />}
                  />

                  {/* Admin routes */}
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/courses" element={<AdminCourses />} />
                  <Route
                    path="/admin/courses/:courseId"
                    element={<CourseManager />}
                  />
                  <Route
                    path="/admin/courses/:courseId/edit"
                    element={<EditCourse />}
                  />
                  <Route
                    path="/admin/courses/:courseId/manager"
                    element={<CourseManager />}
                  />
                  <Route path="/admin/add-course" element={<AddCourse />} />
                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
                  <Route path="/admin/revenue" element={<AdminRevenue />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                  <Route path="/admin/logs" element={<SystemLogs />} />
                  <Route path="/admin/reports" element={<ReportsPage />} />
                  <Route
                    path="/admin/payments"
                    element={<AdminManualPayments />}
                  />
                  <Route path="/admin/quizzes" element={<QuizManager />} />
                  <Route
                    path="/admin/moderation"
                    element={<ContentModeration />}
                  />
                  <Route path="/admin/coupons" element={<AdminCoupons />} />
                  <Route
                    path="/admin/appearance"
                    element={<AdminAppearance />}
                  />
                  <Route path="/admin/faq" element={<AdminFAQ />} />
                  <Route
                    path="/admin/translations"
                    element={<AdminTranslations />}
                  />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <FloatingContact />
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
