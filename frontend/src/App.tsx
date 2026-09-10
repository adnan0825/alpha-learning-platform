/**
 * App - Root component with routing. Alpha.
 */
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
import Index from "./pages/Index";
import Login from "./pages/Login";
import GoogleOAuthCallback from "./pages/GoogleOAuthCallback";
import DashboardRouter from "./pages/DashboardRouter";
import StudentDashboard from "./pages/StudentDashboard";
import InstructorDashboard from "./pages/InstructorDashboard";
import InstructorCourses from "./pages/InstructorCourses";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminCourses from "./pages/AdminCourses";
import AdminAnalytics from "./pages/AdminAnalytics";
import BrowseCourses from "./pages/BrowseCourses";
import MyCourses from "./pages/MyCourses";
import CourseView from "./pages/CourseView";
import AddCourse from "./pages/AddCourse";
import EditCourse from "./pages/EditCourse";
import CourseManager from "./pages/CourseManager";
import QuizPage from "./pages/QuizPage";
import CertificatesPage from "./pages/CertificatesPage";
import ProfilePage from "./pages/ProfilePage";
import InstructorProgress from "./pages/InstructorProgress";
import AdminSettings from "./pages/AdminSettings";
import LearningPath from "./pages/LearningPath";
import BookmarksPage from "./pages/BookmarksPage";
import NotificationsPage from "./pages/NotificationsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import CourseNotes from "./pages/CourseNotes";
import HelpCenter from "./pages/HelpCenter";
import QuizManager from "./pages/QuizManager";
import StudentGrades from "./pages/StudentGrades";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import RevenuePage from "./pages/RevenuePage";
import SystemLogs from "./pages/SystemLogs";
import ReportsPage from "./pages/ReportsPage";
import ContentModeration from "./pages/ContentModeration";
import PaymentsPage from "./pages/PaymentsPage";
import StudentAssignments from "./pages/StudentAssignments";
import StudentCalendar from "./pages/StudentCalendar";
import InstructorAssignments from "./pages/InstructorAssignments";
import FloatingContact from "./components/FloatingContact";
import InstructorWithdrawals from "./pages/InstructorWithdrawals";
import AdminCoupons from "./pages/AdminCoupons";
import AdminAppearance from "./pages/AdminAppearance";
import AdminFAQ from "./pages/AdminFAQ";
import AdminTranslations from "./pages/AdminTranslations";
import NotFound from "./pages/NotFound";
import VerifyPage from "./pages/VerifyPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import PaymentReceipt from "./pages/PaymentReceipt";

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
                <Route path="/student/calendar" element={<StudentCalendar />} />
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
                <Route path="/notifications" element={<NotificationsPage />} />
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
                <Route path="/instructor/add-course" element={<AddCourse />} />
                <Route
                  path="/instructor/progress"
                  element={<InstructorProgress />}
                />
                <Route path="/instructor/quizzes" element={<QuizManager />} />
                <Route path="/instructor/grades" element={<StudentGrades />} />
                <Route
                  path="/instructor/assignments"
                  element={<InstructorAssignments />}
                />
                <Route
                  path="/instructor/withdrawals"
                  element={<InstructorWithdrawals />}
                />
                <Route
                  path="/instructor/announcements"
                  element={<AnnouncementsPage />}
                />
                <Route path="/instructor/revenue" element={<RevenuePage />} />

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
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/logs" element={<SystemLogs />} />
                <Route path="/admin/reports" element={<ReportsPage />} />
                <Route path="/admin/quizzes" element={<QuizManager />} />
                <Route
                  path="/admin/moderation"
                  element={<ContentModeration />}
                />
                <Route path="/admin/payments" element={<PaymentsPage />} />
                <Route path="/admin/coupons" element={<AdminCoupons />} />
                <Route path="/admin/appearance" element={<AdminAppearance />} />
                <Route path="/admin/faq" element={<AdminFAQ />} />
                <Route
                  path="/admin/translations"
                  element={<AdminTranslations />}
                />

                {/* Payment routes */}
                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route path="/payment/failed" element={<PaymentFailed />} />
                <Route path="/payment/receipt" element={<PaymentReceipt />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <FloatingContact />
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
