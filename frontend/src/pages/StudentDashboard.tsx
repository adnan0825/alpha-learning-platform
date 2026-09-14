/**
 * Student Dashboard - Alpha
 * Modern UI inspired by DealDeck/VertexGuard dashboards.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  enrollmentsAPI,
  coursesAPI,
  certificatesAPI,
  CourseData,
  Certificate,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

import CourseCard from "@/components/CourseCard";
import StatCard from "@/components/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Trophy,
  TrendingUp,
  Award,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<
    (CourseData & { progress: number })[]
  >([]);
  const [availableCourses, setAvailableCourses] = useState<CourseData[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [enrollments, certs, allCourses] = await Promise.all([
          enrollmentsAPI.getByStudent(user.id),
          certificatesAPI.getByStudent(user.id),
          coursesAPI.getAll(),
        ]);
        const courses: (CourseData & { progress: number })[] = [];
        for (const enroll of enrollments) {
          const course = await coursesAPI.getById(enroll.courseId);
          if (course) courses.push({ ...course, progress: enroll.progress });
        }
        setEnrolledCourses(courses);
        setCertificates(certs);

        // Get available courses (not enrolled)
        const enrolledIds = enrollments.map((e) => e.courseId);
        const available = allCourses.filter((c) => !enrolledIds.includes(c.id));
        setAvailableCourses(available);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const totalProgress = enrolledCourses.length
    ? Math.round(
        enrolledCourses.reduce((sum, c) => sum + c.progress, 0) /
          enrolledCourses.length,
      )
    : 0;
  const completedCourses = enrolledCourses.filter(
    (c) => c.progress === 100,
  ).length;
  const firstName = user?.displayName?.split(" ")[0] || "Student";

  return (
    <>
      <div className="landing-section-mesh space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-xl ring-1 ring-border/30 backdrop-blur-md dark:bg-card/40"
        >
          <div
            className="pointer-events-none absolute inset-0 hero-saas-grid landing-section-grid-overlay opacity-[0.35] dark:opacity-[0.12]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent/12 blur-3xl"
            aria-hidden
          />
          <div className="relative p-6 lg:p-8 hero-landing-surface">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
              <Sparkles size={14} /> {t("nav.dashboard")}
            </div>
            <h1 className="font-display mt-4 text-2xl font-bold leading-tight tracking-tight lg:text-3xl">
              <span className="hero-headline-gradient">
                {t("dashboard.welcomeBack")}, {firstName}
              </span>
            </h1>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              {t("dashboard.continueJourney")}{" "}
              <span className="font-medium text-foreground">
                {completedCourses}
              </span>{" "}
              {t("dashboard.courseSoFar")}
            </p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label={t("dashboard.enrolled")}
            value={enrolledCourses.length}
            icon={<BookOpen size={18} />}
            gradient="info"
            delay={0.1}
          />
          <StatCard
            label={t("dashboard.completed")}
            value={completedCourses}
            icon={<Trophy size={18} />}
            gradient="success"
            delay={0.2}
            trend={{ value: `${completedCourses}`, positive: true }}
          />
          <StatCard
            label={t("dashboard.certificates")}
            value={certificates.length}
            icon={<Award size={18} />}
            gradient="accent"
            delay={0.3}
          />
          <StatCard
            label={t("dashboard.avgProgress")}
            value={`${totalProgress}%`}
            icon={<TrendingUp size={18} />}
            gradient="primary"
            delay={0.4}
          />
        </div>

        {/* Continue Learning */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t("dashboard.continueLearning")}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/browse")}
              className="text-accent hover:text-accent/80"
            >
              {t("dashboard.browseAll")}{" "}
              <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-72 rounded-2xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((course, i) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  progress={course.progress}
                  onClick={() => navigate(`/course/${course.id}`)}
                  index={i}
                />
              ))}
            </div>
          ) : availableCourses.length > 0 ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                {t("dashboard.notEnrolled")}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCourses.slice(0, 6).map((course, i) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onClick={() => navigate(`/course/${course.id}`)}
                    index={i}
                  />
                ))}
              </div>
              <div className="mt-6 text-center">
                <Button onClick={() => navigate("/browse")} variant="outline">
                  {t("dashboard.viewAllCourses")}{" "}
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="surface-dashboard-card border-2 border-dashed border-border/60 dark:border-border/45">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="h-16 w-16 rounded-2xl gradient-accent flex items-center justify-center mb-4 shadow-glow-accent">
                    <BookOpen size={28} className="text-accent-foreground" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                    {t("dashboard.noCourses")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                    {t("dashboard.browseEnroll")}
                  </p>
                  <Button
                    onClick={() => navigate("/browse")}
                    className="gradient-accent text-accent-foreground hover:opacity-90 shadow-glow-accent"
                  >
                    {t("courses.browse")}{" "}
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Recent Certificates */}
        {certificates.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg font-semibold text-foreground">
                {t("dashboard.yourCertificates")}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/certificates")}
                className="text-accent hover:text-accent/80"
              >
                {t("dashboard.viewAll")}{" "}
                <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.slice(0, 3).map((cert, i) => (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="surface-dashboard-card border-accent/25 transition-all hover:border-accent/35 hover:shadow-elevated">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center shadow-glow-accent shrink-0">
                        <Award size={20} className="text-accent-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display font-semibold text-foreground text-sm truncate">
                          {cert.courseTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cert.certificateNumber}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default StudentDashboard;
