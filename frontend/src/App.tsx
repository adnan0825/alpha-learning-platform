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
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute
                        allowedRoles={["student", "instructor", "admin"]}
                      >
                        <DashboardRouter />
                      </ProtectedRoute>
                    }
                  />

                  {/* Student routes */}
                  <Route
                    path="/student/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <StudentDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/assignments"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <StudentAssignments />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/calendar"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <StudentCalendar />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/courses"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <MyCourses />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-courses"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <MyCourses />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/browse"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <BrowseCourses />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/course/:courseId/quiz/:quizId"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <QuizPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/certificates"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <CertificatesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/learning-path"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <LearningPath />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/bookmarks"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <BookmarksPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/notifications"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <NotificationsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/leaderboard"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <LeaderboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/notes"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <CourseNotes />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/help"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <HelpCenter />
                      </ProtectedRoute>
                    }
                  />

                  {/* Shared routes */}
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute
                        allowedRoles={["student", "instructor", "admin"]}
                      >
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Instructor routes */}
                  <Route
                    path="/instructor"
                    element={
                      <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                        <InstructorDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/instructor/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                        <InstructorDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/instructor/courses"
                    element={
                      <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                        <InstructorCourses />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/instructor/courses/:courseId"
                    element={
                      <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                        <CourseManager />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/instructor/courses/:courseId/edit"
                    element={
                      <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                        <EditCourse />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/instructor/courses/:courseId/manager"
                    element={
                      <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                        <CourseManager />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/instructor/add-course"
                    element={
                      <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                        <AddCourse />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/instructor/learning-paths"
                    element={
                      <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                        <InstructorLearningPaths />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/instructor/progress"
                    element={
                      <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                        <InstructorProgress />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/instructor/quizzes"
                    element={
                      <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                        <QuizManager />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/instructor/grades"
                    element={
                      <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                        <StudentGrades />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/instructor/assignments"
                    element={
                      <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                        <InstructorAssignments />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/instructor/revenue"
                    element={
                      <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                        <InstructorRevenue />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/instructor/announcements"
                    element={
                      <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                        <AnnouncementsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin routes */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminUsers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/courses"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminCourses />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/courses/:courseId"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <CourseManager />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/courses/:courseId/edit"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <EditCourse />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/courses/:courseId/manager"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <CourseManager />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/add-course"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AddCourse />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/analytics"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminAnalytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/revenue"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminRevenue />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/settings"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/logs"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <SystemLogs />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/reports"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <ReportsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/payments"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminManualPayments />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/quizzes"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <QuizManager />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/moderation"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <ContentModeration />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/coupons"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminCoupons />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/appearance"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminAppearance />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/faq"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminFAQ />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/translations"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminTranslations />
                      </ProtectedRoute>
                    }
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
