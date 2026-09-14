/**
 * Browse Courses - Students discover and enroll in published courses.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { coursesAPI, enrollmentsAPI, CourseData } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

import CourseCard from "@/components/CourseCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const BrowseCourses: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [publishedCourses, enrollments] = await Promise.all([
          coursesAPI.getPublished(),
          enrollmentsAPI.getByStudent(user.id),
        ]);
        setCourses(publishedCourses);
        setEnrolledIds(new Set(enrollments.map((e) => e.courseId)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const enroll = async (courseId: string) => {
    if (!user) return;
    try {
      console.log("Enrolling in course:", courseId);
      await enrollmentsAPI.enroll(courseId);
      console.log("Enrollment successful");
      setEnrolledIds((prev) => new Set(prev).add(courseId));
      toast({ title: t("browse.enrollSuccess") });
    } catch (err: any) {
      console.error("Enrollment error:", err);
      toast({
        title: err.message || t("browse.enrollFailed"),
        description: t("browse.enrollHelp"),
        variant: "destructive",
      });
    }
  };

  const categories = [...new Set(courses.map((c) => c.category))];

  const filtered = courses.filter((c) => {
    const matchSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory =
      categoryFilter === "all" || c.category === categoryFilter;
    const matchDifficulty =
      difficultyFilter === "all" || c.difficulty === difficultyFilter;
    return matchSearch && matchCategory && matchDifficulty;
  });

  const handleCourseClick = (course: CourseData) => {
    if (enrolledIds.has(course.id)) {
      // Already enrolled - go to course view
      navigate(`/course/${course.id}`);
    } else {
      // Not enrolled - go to course view where they can enroll or pay
      navigate(`/course/${course.id}`);
    }
  };

  return (
    <>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {t("browse.title")}
          </h1>
          <p className="text-muted-foreground">{t("browse.subtitle")}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder={t("browse.search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("browse.category")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("browse.allCategories")}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("browse.difficulty")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("browse.allLevels")}</SelectItem>
              <SelectItem value="beginner">{t("browse.beginner")}</SelectItem>
              <SelectItem value="intermediate">
                {t("browse.intermediate")}
              </SelectItem>
              <SelectItem value="advanced">{t("browse.advanced")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((course) => (
              <div key={course.id}>
                <CourseCard
                  course={course}
                  onClick={() => {
                    console.log(
                      "Card clicked:",
                      course.id,
                      "Enrolled:",
                      enrolledIds.has(course.id),
                    );
                    handleCourseClick(course);
                  }}
                />
                {enrolledIds.has(course.id) && (
                  <p className="mt-2 text-xs text-center text-success font-medium">
                    ✓ {t("browse.enrolled")}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-12">
            {t("browse.empty")}
          </p>
        )}
      </div>
    </>
  );
};

export default BrowseCourses;
