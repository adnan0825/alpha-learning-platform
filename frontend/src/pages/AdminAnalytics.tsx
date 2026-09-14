/**
 * Admin Analytics Page - Modern redesign with rich charts.
 */
import React, { useEffect, useState } from "react";
import { analyticsAPI, coursesAPI, CourseData } from "@/lib/api";

import StatCard from "@/components/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Users, BookOpen, TrendingUp, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const AdminAnalytics: React.FC = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalInstructors: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    recentSignups: 0,
  });
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [growthData, setGrowthData] = useState<
    Array<{ month: string; users: number; enrollments: number }>
  >([]);
  const [categoryData, setCategoryData] = useState<
    Array<{ name: string; value: number }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, c, growth, categories] = await Promise.all([
          analyticsAPI.getPlatformStats(),
          coursesAPI.getAll(),
          analyticsAPI.getGrowthTrends(),
          analyticsAPI.getCategoryDistribution(),
        ]);
        setStats(s);
        setCourses(c.sort((a, b) => b.enrolledCount - a.enrolledCount));
        setGrowthData(growth);
        setCategoryData(categories);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const maxEnrolled = courses[0]?.enrolledCount || 1;

  // Color palette for categories
  const categoryColors = [
    "hsl(210, 92%, 55%)",
    "hsl(38, 92%, 50%)",
    "hsl(152, 60%, 42%)",
    "hsl(280, 60%, 55%)",
    "hsl(0, 70%, 55%)",
    "hsl(180, 60%, 45%)",
    "hsl(30, 80%, 55%)",
    "hsl(240, 50%, 60%)",
  ];
  const categoryDataWithColors = categoryData.map((d, i) => ({
    ...d,
    color: categoryColors[i % categoryColors.length],
  }));

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.75rem",
    color: "hsl(var(--foreground))",
    fontSize: 12,
  };

  return (
    <>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 size={24} className="text-accent" />{" "}
            {t("admin.analytics.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("admin.analytics.subtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label={t("admin.analytics.totalUsers")}
            value={stats.totalUsers}
            icon={<Users size={18} />}
            gradient="info"
            delay={0.1}
            trend={{ value: `+${stats.recentSignups}`, positive: true }}
          />
          <StatCard
            label={t("admin.analytics.totalCourses")}
            value={stats.totalCourses}
            icon={<BookOpen size={18} />}
            gradient="accent"
            delay={0.2}
          />
          <StatCard
            label={t("admin.analytics.totalEnrollments")}
            value={stats.totalEnrollments}
            icon={<TrendingUp size={18} />}
            gradient="success"
            delay={0.3}
          />
        </div>

        {/* Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-card">
            <CardContent className="p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">
                {t("admin.analytics.growth")}
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={growthData}
                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorUsers"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(210, 92%, 55%)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(210, 92%, 55%)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorEnroll"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(38, 92%, 50%)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(38, 92%, 50%)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="month"
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
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="hsl(210, 92%, 55%)"
                      fill="url(#colorUsers)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="enrollments"
                      stroke="hsl(38, 92%, 50%)"
                      fill="url(#colorEnroll)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-3">
                <div className="flex items-center gap-2 text-xs">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: "hsl(210, 92%, 55%)" }}
                  />
                  <span className="text-muted-foreground">
                    {t("admin.analytics.users")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: "hsl(38, 92%, 50%)" }}
                  />
                  <span className="text-muted-foreground">
                    {t("admin.analytics.enrollments")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="shadow-card h-full">
              <CardContent className="p-6">
                <h3 className="font-display font-semibold text-foreground mb-4">
                  {t("admin.analytics.categories")}
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryDataWithColors}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {categoryDataWithColors.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                  {categoryDataWithColors.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold text-foreground">
                        {d.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Course Popularity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="shadow-card h-full">
              <CardContent className="p-6">
                <h3 className="font-display font-semibold text-foreground mb-4">
                  Course Popularity
                </h3>
                <div className="space-y-4">
                  {courses.map((c, i) => (
                    <div key={c.id}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-foreground font-medium truncate mr-4">
                          {c.title}
                        </span>
                        <span className="text-muted-foreground flex-shrink-0 text-xs font-semibold">
                          {c.enrolledCount} students
                        </span>
                      </div>
                      <Progress
                        value={(c.enrolledCount / maxEnrolled) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="shadow-card">
            <CardContent className="p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">
                Quick Stats
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                  <span className="text-sm text-muted-foreground">
                    Avg Students/Course
                  </span>
                  <span className="font-display font-bold text-foreground">
                    {stats.totalCourses
                      ? Math.round(stats.totalEnrollments / stats.totalCourses)
                      : 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                  <span className="text-sm text-muted-foreground">
                    Recent Signups
                  </span>
                  <span className="font-display font-bold text-foreground">
                    {stats.recentSignups}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                  <span className="text-sm text-muted-foreground">
                    Published Courses
                  </span>
                  <span className="font-display font-bold text-foreground">
                    {courses.filter((c) => c.status === "published").length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default AdminAnalytics;
