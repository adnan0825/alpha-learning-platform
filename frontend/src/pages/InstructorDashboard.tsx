/**
 * Instructor Dashboard - Alpha
 * Modern redesign with charts and glassmorphism.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { coursesAPI, CourseData } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

import CourseCard from "@/components/CourseCard";
import StatCard from "@/components/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Users,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const InstructorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;
      try {
        setCourses(await coursesAPI.getByInstructor(user.id));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [user]);

  const totalStudents = courses.reduce(
    (sum, c) => sum + (c.enrolledCount || 0),
    0,
  );
  const publishedCount = courses.filter((c) => c.status === "published").length;

  const chartData = courses.map((c) => ({
    name: c.title.length > 15 ? c.title.slice(0, 15) + "…" : c.title,
    students: c.enrolledCount,
  }));

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
          <div className="relative flex flex-col gap-6 p-6 hero-landing-surface sm:flex-row sm:items-center sm:justify-between lg:p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
                <Sparkles size={14} /> {t("dashboard.instructor")}
              </div>
              <h1 className="font-display mt-4 text-2xl font-bold leading-tight tracking-tight lg:text-3xl">
                <span className="hero-headline-gradient">
                  {t("dashboard.teachingHub")}
                </span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {courses.length}
                </span>{" "}
                {t("dashboard.coursesEnrolled")} ·{" "}
                <span className="font-medium text-foreground">
                  {totalStudents}
                </span>{" "}
                {t("dashboard.studentsEnrolled")}
              </p>
            </div>
            <Button
              onClick={() => navigate("/instructor/add-course")}
              className="gradient-accent shrink-0 text-accent-foreground shadow-glow-accent hover:opacity-90"
            >
              <PlusCircle size={18} className="mr-2" />{" "}
              {t("dashboard.addCourse")}
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
          <StatCard
            label={t("dashboard.totalCourses")}
            value={courses.length}
            icon={<BookOpen size={18} />}
            gradient="info"
            delay={0.1}
          />
          <StatCard
            label={t("dashboard.published")}
            value={publishedCount}
            icon={<TrendingUp size={18} />}
            gradient="success"
            delay={0.2}
            trend={{
              value: `${publishedCount}/${courses.length}`,
              positive: true,
            }}
          />
          <StatCard
            label={t("dashboard.totalStudents")}
            value={totalStudents}
            icon={<Users size={18} />}
            gradient="accent"
            delay={0.3}
          />
        </div>

        {/* Student Enrollment Chart */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="surface-dashboard-card shadow-elevated ring-1 ring-border/20 transition-shadow hover:ring-accent/15">
              <CardContent className="p-6">
                <h3 className="font-display mb-1 font-semibold text-foreground">
                  {t("dashboard.studentsPerCourse")}
                </h3>
                <p className="mb-4 text-xs text-muted-foreground">
                  {t("dashboard.enrollmentByCourse")}
                </p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{
                          fontSize: 11,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                      />
                      <YAxis
                        tick={{
                          fontSize: 11,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.75rem",
                          color: "hsl(var(--foreground))",
                          fontSize: 12,
                        }}
                      />
                      <Bar
                        dataKey="students"
                        fill="hsl(38 92% 50%)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Courses Grid */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t("dashboard.yourCourses")}
            </h2>
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
          ) : courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course, i) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onClick={() => navigate(`/instructor/courses/${course.id}`)}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <Card className="shadow-card border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-16 w-16 rounded-2xl gradient-accent flex items-center justify-center mb-4 shadow-glow-accent">
                  <BookOpen size={28} className="text-accent-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                  {t("dashboard.noCourses")}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {t("dashboard.createFirstCourse")}
                </p>
                <Button
                  onClick={() => navigate("/instructor/add-course")}
                  className="gradient-accent text-accent-foreground hover:opacity-90 shadow-glow-accent"
                >
                  {t("dashboard.createCourse")}{" "}
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
};

export default InstructorDashboard;
