/**
 * My Courses — enrolled courses for students.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { enrollmentsAPI, coursesAPI, CourseData, Enrollment } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

import CourseCard from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";

const MyCourses: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [rows, setRows] = useState<{ course: CourseData; progress: number }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const enrollments: Enrollment[] = await enrollmentsAPI.getMyCourses();
        if (enrollments.length === 0) {
          setRows([]);
          return;
        }
        const coursePromises = enrollments.map((e) =>
          coursesAPI.getById(e.courseId),
        );
        const courses = await Promise.all(coursePromises);
        setRows(
          courses.map((course, i) => ({
            course,
            progress: enrollments[i]?.progress ?? 0,
          })),
        );
      } catch (err) {
        console.error("Failed to load my courses:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {t("courses.my")}
          </h1>
          <p className="text-muted-foreground">{t("courses.loading")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {t("courses.my")}
          </h1>
          <p className="text-muted-foreground">{t("courses.notEnrolled")}</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen size={48} className="text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t("courses.noCourses")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t("courses.browseCatalog")}
          </p>
          <Button onClick={() => navigate("/browse")}>
            {t("courses.browse")} <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {t("courses.my")}
        </h1>
        <p className="text-muted-foreground">
          {rows.length} {t("courses.enrolled")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rows.map(({ course, progress }, i) => (
          <CourseCard
            key={course.id}
            course={course}
            progress={progress}
            onClick={() => navigate(`/course/${course.id}`)}
            index={i}
          />
        ))}
      </div>
    </div>
  );
};

export default MyCourses;
