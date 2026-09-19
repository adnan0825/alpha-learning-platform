/**
 * Admin Dashboard - Alpha
 * Modern design with charts, tables, and glassmorphism stat cards.
 */
import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  usersAPI,
  coursesAPI,
  analyticsAPI,
  adminAPI,
  UserProfile,
  CourseData,
  UserFeedbackItem,
} from "@/lib/api";

import StatCard from "@/components/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  BookOpen,
  TrendingUp,
  Shield,
  Trash2,
  CheckCircle,
  XCircle,
  UserX,
  GraduationCap,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalInstructors: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    recentSignups: 0,
  });
  const [loading, setLoading] = useState(true);
  const [feedbackList, setFeedbackList] = useState<UserFeedbackItem[]>([]);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [feedbackToDelete, setFeedbackToDelete] =
    useState<UserFeedbackItem | null>(null);
  const [deletingFeedback, setDeletingFeedback] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const pathDefault = location.pathname.includes("/admin/courses")
    ? "courses"
    : "users";
  const [tableTab, setTableTab] = useState(() => {
    const t = new URLSearchParams(location.search).get("tab");
    if (t === "feedback") return "feedback";
    return pathDefault;
  });

  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tab");
    if (t === "feedback") setTableTab("feedback");
  }, [location.search]);

  const loadFeedback = useCallback(async () => {
    try {
      const list = await adminAPI.listFeedback();
      setFeedbackList(list);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [u, c, s] = await Promise.all([
        usersAPI.getAll(),
        coursesAPI.getAll(),
        analyticsAPI.getPlatformStats(),
      ]);
      setUsers(u);
      setCourses(c);
      setStats(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    loadFeedback();
    const id = setInterval(loadFeedback, 20000);
    return () => clearInterval(id);
  }, [loadFeedback]);

  const toggleCourseStatus = async (
    courseId: string,
    currentStatus: string,
  ) => {
    const newStatus = currentStatus === "published" ? "archived" : "published";
    try {
      await coursesAPI.update(courseId, {
        status: newStatus as CourseData["status"],
      });
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId
            ? { ...c, status: newStatus as CourseData["status"] }
            : c,
        ),
      );
      toast({ title: `${t("dashboard.courses")} ${newStatus}` });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCourse = async (courseId: string) => {
    try {
      await coursesAPI.delete(courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      toast({ title: `${t("dashboard.courses")} ${t("dashboard.delete")}` });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await usersAPI.delete(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast({ title: `${t("dashboard.users")} ${t("dashboard.delete")}` });
    } catch (err) {
      console.error(err);
    }
  };

  const sendFeedbackReply = async (id: string) => {
    const text = replyDraft[id]?.trim();
    if (!text) return;
    try {
      await adminAPI.replyFeedback(id, text);
      setReplyDraft((p) => ({ ...p, [id]: "" }));
      toast({
        title: t("dashboard.sendReply"),
        description: t("dashboard.feedback"),
      });
      await loadFeedback();
    } catch (err: any) {
      toast({
        title: t("dashboard.sendReply"),
        description: err?.message || "Try again",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteFeedback = async () => {
    if (!feedbackToDelete) return;
    setDeletingFeedback(true);
    try {
      await adminAPI.deleteFeedback(feedbackToDelete.id);
      setFeedbackList((prev) =>
        prev.filter((f) => f.id !== feedbackToDelete.id),
      );
      setReplyDraft((p) => {
        const next = { ...p };
        delete next[feedbackToDelete.id];
        return next;
      });
      toast({ title: `${t("dashboard.feedback")} ${t("dashboard.delete")}` });
      setFeedbackToDelete(null);
    } catch (err: any) {
      toast({
        title: t("dashboard.delete"),
        description: err?.message || "Try again",
        variant: "destructive",
      });
    } finally {
      setDeletingFeedback(false);
    }
  };

  const onTableTabChange = (v: string) => {
    setTableTab(v);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v === "feedback") next.set("tab", "feedback");
      else next.delete("tab");
      return next;
    });
  };

  const adminCount = users.filter((u) => u.role === "admin").length;
  const openFeedbackCount = feedbackList.filter((f) => !f.adminReply).length;
  const pieData = [
    {
      name: "Students",
      value: stats.totalStudents,
      color: "hsl(210, 92%, 55%)",
    },
    {
      name: "Instructors",
      value: stats.totalInstructors,
      color: "hsl(38, 92%, 50%)",
    },
    {
      name: "Admins",
      value: Math.max(adminCount, 1),
      color: "hsl(265, 72%, 52%)",
    },
  ];

  const courseChartData = courses.slice(0, 5).map((c) => ({
    name: c.title.length > 12 ? c.title.slice(0, 12) + "…" : c.title,
    students: c.enrolledCount,
  }));

  const roleBadgeClass: Record<string, string> = {
    admin: "bg-destructive/10 text-destructive border-destructive/20",
    instructor: "bg-accent/10 text-accent border-accent/20",
    student: "bg-info/10 text-info border-info/20",
  };

  return (
    <>
      <AlertDialog
        open={Boolean(feedbackToDelete)}
        onOpenChange={(open) => !open && setFeedbackToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("dashboard.deleteMessageTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.deleteMessageDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingFeedback}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingFeedback}
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteFeedback();
              }}
            >
              {deletingFeedback
                ? t("dashboard.deleting")
                : t("dashboard.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="landing-section-mesh space-y-8">
        {/* Hero — aligned with marketing (mesh + grid + gradient headline) */}
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
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl dark:bg-accent/10"
            aria-hidden
          />
          <div className="relative p-6 lg:p-8 hero-landing-surface">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
              <Shield size={14} /> {t("dashboard.admin")}
            </div>
            <h1 className="font-display mt-4 text-2xl font-bold leading-tight tracking-tight lg:text-3xl">
              <span className="hero-headline-gradient">
                {t("dashboard.platformOverview")}
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {t("dashboard.manageSummary")}{" "}
              <span className="font-medium text-foreground">
                {stats.totalUsers}
              </span>{" "}
              {t("dashboard.users")} {t("dashboard.and")}{" "}
              <span className="font-medium text-foreground">
                {stats.totalCourses}
              </span>{" "}
              {t("dashboard.courses")}.
            </p>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <StatCard
            label={t("dashboard.users")}
            value={stats.totalUsers}
            icon={<Users size={18} />}
            gradient="info"
            delay={0.1}
            trend={{ value: `+${stats.recentSignups}`, positive: true }}
          />
          <StatCard
            label={t("dashboard.students")}
            value={stats.totalStudents}
            icon={<GraduationCap size={18} />}
            gradient="success"
            delay={0.2}
          />
          <StatCard
            label="Courses"
            value={stats.totalCourses}
            icon={<BookOpen size={18} />}
            gradient="accent"
            delay={0.3}
          />
          <StatCard
            label="Enrollments"
            value={stats.totalEnrollments}
            icon={<TrendingUp size={18} />}
            gradient="primary"
            delay={0.4}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="surface-dashboard-card h-full shadow-elevated transition-shadow hover:shadow-elevated hover:ring-1 hover:ring-accent/15">
              <CardContent className="p-6">
                <h3 className="font-display mb-1 font-semibold text-foreground">
                  {t("dashboard.userDistribution")}
                </h3>
                <p className="mb-4 text-xs text-muted-foreground">
                  {t("dashboard.byRole")}
                </p>
                <div className="h-52 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.75rem",
                          color: "hsl(var(--foreground))",
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 mt-2">
                  {pieData.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center gap-2 text-xs"
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full"
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="surface-dashboard-card h-full shadow-elevated transition-shadow hover:shadow-elevated hover:ring-1 hover:ring-accent/15">
              <CardContent className="p-6">
                <h3 className="font-display mb-1 font-semibold text-foreground">
                  {t("dashboard.coursePopularity")}
                </h3>
                <p className="mb-4 text-xs text-muted-foreground">
                  {t("dashboard.topCourses")}
                </p>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={courseChartData}
                      margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{
                          fontSize: 10,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                      />
                      <YAxis
                        tick={{
                          fontSize: 10,
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
                        fill="hsl(210, 92%, 55%)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Data Tables */}
        <Tabs value={tableTab} onValueChange={onTableTabChange}>
          <TabsList className="flex-wrap rounded-xl border border-border/50 bg-card/80 p-1 shadow-sm ring-1 ring-border/30 backdrop-blur-sm dark:bg-card/50">
            <TabsTrigger
              value="users"
              className="rounded-lg data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/40"
            >
              {t("dashboard.users")} ({users.length})
            </TabsTrigger>
            <TabsTrigger
              value="courses"
              className="rounded-lg data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/40"
            >
              Courses ({courses.length})
            </TabsTrigger>
            <TabsTrigger
              value="feedback"
              className="rounded-lg gap-1.5 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/40"
            >
              <MessageSquare size={14} />
              {t("dashboard.feedback")}
              {openFeedbackCount > 0 ? (
                <Badge
                  variant="secondary"
                  className="ml-0.5 h-5 min-w-5 px-1.5 text-[10px] tabular-nums"
                >
                  {openFeedbackCount}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <Card className="surface-dashboard-card overflow-hidden shadow-elevated ring-1 ring-border/20">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/40 backdrop-blur-sm dark:bg-muted/20">
                      <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-12 text-center text-muted-foreground"
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr
                          key={u.id}
                          className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full gradient-accent flex items-center justify-center text-accent-foreground text-xs font-bold shrink-0">
                                {u.displayName.charAt(0)}
                              </div>
                              <span className="font-medium text-foreground">
                                {u.displayName}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground">
                            {u.email}
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase tracking-wider ${roleBadgeClass[u.role] || ""}`}
                            >
                              {u.role}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground text-xs">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5">
                            {u.role !== "admin" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteUser(u.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <UserX size={15} />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="mt-4">
            <Card className="surface-dashboard-card overflow-hidden shadow-elevated ring-1 ring-border/20">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/40 backdrop-blur-sm dark:bg-muted/20">
                      <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        From
                      </th>
                      <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Message
                      </th>
                      <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Reply
                      </th>
                      <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-12 text-center text-muted-foreground"
                        >
                          No messages yet. They appear here automatically when
                          learners use the homepage form.
                        </td>
                      </tr>
                    ) : (
                      feedbackList.map((f) => (
                        <tr
                          key={f.id}
                          className="border-b last:border-0 align-top hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium text-foreground">
                                  {f.userName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {f.userEmail}
                                </p>
                                {f.subject ? (
                                  <p className="mt-1 text-xs font-medium text-accent">
                                    {f.subject}
                                  </p>
                                ) : null}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shrink-0 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setFeedbackToDelete(f)}
                              >
                                <Trash2 size={14} />
                                Delete
                              </Button>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 max-w-md text-muted-foreground whitespace-pre-wrap">
                            {f.message}
                          </td>
                          <td className="px-5 py-3.5 min-w-[220px]">
                            {f.adminReply ? (
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap border border-border/50 rounded-lg p-2 bg-muted/20">
                                {f.adminReply}
                              </p>
                            ) : (
                              <div className="space-y-2">
                                <Textarea
                                  placeholder="Write a reply…"
                                  rows={3}
                                  className="text-xs"
                                  value={replyDraft[f.id] || ""}
                                  onChange={(e) =>
                                    setReplyDraft((p) => ({
                                      ...p,
                                      [f.id]: e.target.value,
                                    }))
                                  }
                                />
                                <Button
                                  size="sm"
                                  className="w-full gradient-accent text-accent-foreground"
                                  onClick={() => sendFeedbackReply(f.id)}
                                >
                                  Send reply & notify user
                                </Button>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                            {f.createdAt &&
                            !Number.isNaN(new Date(f.createdAt).getTime())
                              ? new Date(f.createdAt).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="mt-4">
            <Card className="surface-dashboard-card overflow-hidden shadow-elevated ring-1 ring-border/20">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/40 backdrop-blur-sm dark:bg-muted/20">
                      <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Instructor
                      </th>
                      <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Students
                      </th>
                      <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-12 text-center text-muted-foreground"
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : (
                      courses.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-5 py-3.5 font-medium text-foreground">
                            {c.title}
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground">
                            {c.instructorName}
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge
                              variant={
                                c.status === "published"
                                  ? "default"
                                  : "secondary"
                              }
                              className={
                                c.status === "published"
                                  ? "bg-success/10 text-success border-success/20"
                                  : ""
                              }
                            >
                              {c.status}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground font-medium">
                            {c.enrolledCount}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  toggleCourseStatus(c.id, c.status)
                                }
                                className="h-8 w-8 hover:bg-muted"
                              >
                                {c.status === "published" ? (
                                  <XCircle size={15} />
                                ) : (
                                  <CheckCircle
                                    size={15}
                                    className="text-success"
                                  />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteCourse(c.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 size={15} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default AdminDashboard;
