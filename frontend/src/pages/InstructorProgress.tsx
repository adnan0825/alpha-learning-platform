/**
 * Instructor Student Progress - View student progress across courses.
 */
import React, { useEffect, useState } from "react";
import {
  coursesAPI,
  enrollmentsAPI,
  usersAPI,
  CourseData,
  Enrollment,
  UserProfile,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, Users } from "lucide-react";

const InstructorProgress: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [enrollments, setEnrollments] = useState<
    (Enrollment & { studentName: string })[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;
      try {
        const data = await coursesAPI.getByInstructor(user.id);
        setCourses(data);
        if (data.length > 0) setSelectedCourse(data[0].id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [user]);

  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!selectedCourse) return;
      try {
        const enrolls =
          await enrollmentsAPI.getCourseEnrollments(selectedCourse);
        const formatted = enrolls.map((e: any) => ({
          ...e,
          id: String(e.id),
          studentId: String(e.user_id),
          courseId: String(e.course_id),
          studentName: e.user_name || "Unknown",
          progress: e.progress || 0,
          completedVideos: e.completed_videos || [],
          enrolledAt: e.enrolled_at,
        }));
        setEnrollments(formatted);
      } catch (err) {
        console.error(err);
      }
    };
    fetchEnrollments();
  }, [selectedCourse]);

  const avgProgress = enrollments.length
    ? Math.round(
        enrollments.reduce((sum, e) => sum + e.progress, 0) /
          enrollments.length,
      )
    : 0;

  return (
    <>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 size={24} className="text-accent" />{" "}
            {t("progress.title")}
          </h1>
          <p className="text-muted-foreground">{t("progress.subtitle")}</p>
        </div>

        <div className="max-w-xs">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger>
              <SelectValue placeholder={t("progress.selectCourse")} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCourse && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="shadow-card">
                <CardContent className="p-4">
                  <div className="text-accent mb-2">
                    <Users size={20} />
                  </div>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {enrollments.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("progress.enrolledStudents")}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="p-4">
                  <div className="text-accent mb-2">
                    <BarChart3 size={20} />
                  </div>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {avgProgress}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("progress.average")}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="p-4">
                  <div className="text-success mb-2">
                    <BarChart3 size={20} />
                  </div>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {enrollments.filter((e) => e.progress === 100).length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("progress.completed")}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {t("progress.student")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {t("progress.progress")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {t("progress.lessonsDone")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {t("progress.enrolled")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          {t("progress.empty")}
                        </td>
                      </tr>
                    ) : (
                      enrollments.map((e) => (
                        <tr
                          key={e.id}
                          className="border-b last:border-0 hover:bg-muted/30"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">
                            {e.studentName}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3 w-40">
                              <Progress
                                value={e.progress}
                                className="h-2 flex-1"
                              />
                              <span className="text-xs text-muted-foreground w-8">
                                {e.progress}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {e.completedVideos.length}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(e.enrolledAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  );
};

export default InstructorProgress;
