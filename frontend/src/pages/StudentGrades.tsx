/**
 * Instructor Student Grades - View enrolled students and their progress/scores.
 * Uses real backend analytics API
 */
import React, { useEffect, useState } from "react";
import { coursesAPI, instructorAnalyticsAPI, CourseData } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Users,
  TrendingUp,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface StudentGrade {
  student_id: string;
  student_name: string;
  student_email: string;
  student_avatar?: string;
  quiz_id: string | null;
  quiz_title: string | null;
  assignment_id: string | null;
  assignment_title: string | null;
  assessment_type: "quiz" | "assignment";
  highest_score: number;
  lowest_score: number;
  average_score: number;
  attempts: number;
}

const StudentGrades: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      try {
        const c = await coursesAPI.getByInstructor(user.id);
        setCourses(c);
        if (c.length > 0) {
          setSelectedCourse(c[0].id);
          await loadGrades(c[0].id);
        }
      } catch (err) {
        console.error("Failed to load courses:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user]);

  const loadGrades = async (courseId: string) => {
    setSelectedCourse(courseId);
    setRefreshing(true);
    try {
      const data = await instructorAnalyticsAPI.getGrades(courseId);
      setGrades(
        data.map((grade) => ({
          ...grade,
          average_score: Number.isFinite(Number(grade.average_score))
            ? Number(grade.average_score)
            : 0,
          highest_score: Number.isFinite(Number(grade.highest_score))
            ? Number(grade.highest_score)
            : 0,
          lowest_score: Number.isFinite(Number(grade.lowest_score))
            ? Number(grade.lowest_score)
            : 0,
          attempts: Math.max(0, Number(grade.attempts) || 0),
        })),
      );
    } catch (err) {
      console.error("Failed to load grades:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Group grades by student
  const students = grades.reduce(
    (acc, grade) => {
      if (!acc[grade.student_id]) {
        acc[grade.student_id] = {
          id: grade.student_id,
          name: grade.student_name,
          email: grade.student_email,
          avatar: grade.student_avatar,
          assessments: [],
          avgScore: 0,
        };
      }
      acc[grade.student_id].assessments.push(grade);

      // Calculate overall average
      const completedAssessments = acc[grade.student_id].assessments.filter(
        (assessment: StudentGrade) =>
          assessment.attempts > 0 && Number.isFinite(assessment.average_score),
      );
      const totalAttempts = completedAssessments.reduce(
        (sum: number, assessment: StudentGrade) => sum + assessment.attempts,
        0,
      );
      const totalScore = completedAssessments.reduce(
        (sum: number, assessment: StudentGrade) =>
          sum + assessment.average_score * assessment.attempts,
        0,
      );
      acc[grade.student_id].avgScore =
        totalAttempts > 0 && Number.isFinite(totalScore)
          ? Math.round(totalScore / totalAttempts)
          : 0;

      return acc;
    },
    {} as Record<string, any>,
  );

  const studentsList = Object.values(students);
  const avgProgress = studentsList.length
    ? Math.round(
        studentsList.reduce((sum, s: any) => sum + s.avgScore, 0) /
          studentsList.length,
      )
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <GraduationCap size={24} className="text-accent" />{" "}
              {t("grades.title")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("grades.subtitle")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadGrades(selectedCourse)}
            disabled={refreshing}
            className="text-xs"
          >
            <RefreshCw
              size={14}
              className={`mr-1.5 ${refreshing ? "animate-spin" : ""}`}
            />
            {t("grades.refresh")}
          </Button>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedCourse} onValueChange={loadGrades}>
            <SelectTrigger className="w-full max-w-xs bg-card">
              <SelectValue placeholder={t("grades.selectCourse")} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border/50">
              <Users size={16} className="text-info" />
              <span className="text-sm font-semibold text-foreground">
                {studentsList.length}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("grades.students")}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border/50">
              <TrendingUp size={16} className="text-success" />
              <span className="text-sm font-semibold text-foreground">
                {avgProgress}%
              </span>
              <span className="text-xs text-muted-foreground">
                {t("grades.avgScore")}
              </span>
            </div>
          </div>
        </div>

        {/* Student Table */}
        {studentsList.length > 0 ? (
          <Card className="shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      {t("grades.students")}
                    </th>
                    <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      {t("grades.quizzes")}
                    </th>
                    <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      {t("grades.avgScore")}
                    </th>
                    <th className="px-5 py-3.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      {t("grades.performance")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {studentsList.map((s: any, i) => (
                    <tr
                      key={s.id}
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full gradient-accent flex items-center justify-center text-accent-foreground text-xs font-bold">
                            {s.avatar ? (
                              <img
                                src={s.avatar}
                                alt={s.name}
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              s.name.charAt(0)
                            )}
                          </div>
                          <span className="font-medium text-foreground">
                            {s.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {s.email}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <Trophy size={14} className="text-accent" />
                          <span className="text-sm font-medium">
                            {
                              s.assessments.filter(
                                (assessment: StudentGrade) =>
                                  assessment.attempts > 0,
                              ).length
                            }{" "}
                            Assessments
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-sm font-bold ${
                            s.avgScore >= 80
                              ? "text-success"
                              : s.avgScore >= 60
                                ? "text-accent"
                                : "text-warning"
                          }`}
                        >
                          {s.avgScore}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5 w-48">
                        <div className="flex items-center gap-2">
                          <Progress value={s.avgScore} className="h-2 flex-1" />
                          <span className="text-xs font-semibold text-foreground w-8">
                            {s.avgScore}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card className="shadow-card border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <GraduationCap size={28} className="text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                {t("grades.emptyTitle")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("grades.emptyDescription")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default StudentGrades;
