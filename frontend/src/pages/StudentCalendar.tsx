/**
 * Student Calendar Page
 */
import React, { useEffect, useState } from "react";
import {
  assignmentsAPI,
  enrollmentsAPI,
  quizzesAPI,
  Assignment,
  Enrollment,
  Quiz,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

const StudentCalendar: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState<
    Array<{
      date: string;
      title: string;
      type: "quiz" | "assignment";
      color: string;
    }>
  >([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  useEffect(() => {
    if (!user) return;
    const loadEvents = async () => {
      try {
        const currentEnrollments = await enrollmentsAPI.getMyCourses();
        setEnrollments(currentEnrollments);
        const courseData = await Promise.all(
          currentEnrollments.map(async (enrollment) => {
            const [assignments, quizzes] = await Promise.all([
              assignmentsAPI.getByCourse(enrollment.courseId),
              quizzesAPI.getByCourse(enrollment.courseId),
            ]);
            return { assignments, quizzes };
          }),
        );
        const nextEvents = courseData.flatMap(({ assignments, quizzes }) => [
          ...assignments.map((assignment: Assignment) => ({
            date: assignment.dueDate,
            title: assignment.title,
            type: "assignment" as const,
            color: "bg-info/20 text-info",
          })),
          ...quizzes
            .filter((quiz: Quiz) => Boolean(quiz.createdAt))
            .map((quiz: Quiz) => ({
              date: quiz.createdAt,
              title: quiz.title,
              type: "quiz" as const,
              color: "bg-accent/20 text-accent",
            })),
        ]);
        setEvents(nextEvents);
      } catch (error) {
        console.error("Failed to load calendar events:", error);
        setEvents([]);
      }
    };
    void loadEvents();
  }, [user]);
  const currentMonth = visibleMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate();
  const firstWeekday = visibleMonth.getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const changeMonth = (offset: number) => {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarIcon size={24} className="text-accent" />{" "}
          {t("calendar.title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("calendar.subtitle")}
        </p>
      </motion.div>

      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">
              {currentMonth}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Previous month"
                onClick={() => changeMonth(-1)}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Next month"
                onClick={() => changeMonth(1)}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-4 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold text-muted-foreground uppercase"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-4">
            {/* Empty cells for start of month */}
            {Array.from({ length: firstWeekday }, (_, i) => i).map((i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map((day) => {
              const dayEvents = events.filter((event) => {
                const date = new Date(event.date);
                return (
                  date.getFullYear() === visibleMonth.getFullYear() &&
                  date.getMonth() === visibleMonth.getMonth() &&
                  date.getDate() === day
                );
              });
              return (
                <div
                  key={day}
                  className="min-h-[100px] border border-border/50 rounded-xl p-2 hover:bg-muted/20 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">
                    {day}
                  </span>
                  <div className="mt-2 space-y-1">
                    {dayEvents.map((ev, i) => (
                      <div
                        key={i}
                        className={`text-[10px] px-1.5 py-1 rounded-md truncate font-medium ${ev.color}`}
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-card md:col-span-2">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">
              {t("calendar.upcoming")}
            </h3>
            <div className="space-y-3">
              {events
                .filter((event) => new Date(event.date) >= new Date())
                .sort(
                  (a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime(),
                )
                .slice(0, 10)
                .map((ev, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-col flex items-center justify-center h-12 w-12 rounded-lg bg-muted text-foreground font-bold leading-none">
                      <span className="text-xs uppercase text-muted-foreground">
                        {new Date(ev.date).toLocaleDateString(undefined, {
                          month: "short",
                        })}
                      </span>
                      <span className="text-lg">
                        {new Date(ev.date).getDate()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm">
                        {ev.title}
                      </h4>
                      <p className="text-xs text-muted-foreground capitalize">
                        {ev.type}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      <Clock size={10} className="mr-1" />
                      {new Date(ev.date).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">
              {t("calendar.studyStats")}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("calendar.enrolledCourses")}
                </span>
                <span className="font-bold text-accent">
                  {enrollments.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("calendar.upcomingItems")}
                </span>
                <span className="font-bold text-foreground">
                  {events.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("calendar.completedCourses")}
                </span>
                <span className="font-bold text-foreground">
                  {
                    enrollments.filter(
                      (enrollment) => enrollment.progress >= 100,
                    ).length
                  }
                </span>
              </div>
              <div className="pt-4 mt-2 border-t border-border/50">
                <Button
                  className="w-full gradient-accent text-accent-foreground"
                  disabled={enrollments.length === 0}
                  onClick={() => {
                    const nextCourse =
                      enrollments.find(
                        (enrollment) => enrollment.progress < 100,
                      ) || enrollments[0];
                    if (nextCourse) navigate(`/course/${nextCourse.courseId}`);
                  }}
                >
                  <BookOpen size={16} className="mr-2" />{" "}
                  {t("calendar.continue")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentCalendar;
