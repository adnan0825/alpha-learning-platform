/**
 * Student Learning Path - Visual roadmap of course progression.
 * Uses real backend data from learning_paths API
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  learningPathsAPI,
  enrollmentsAPI,
  coursesAPI,
  CourseData,
  LearningPath as LearningPathType,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  Map as MapIcon,
  CheckCircle,
  Circle,
  ArrowRight,
  BookOpen,
  Lock,
  Trophy,
  Target,
} from "lucide-react";

const LearningPath: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [availablePaths, setAvailablePaths] = useState<LearningPathType[]>([]);
  const [selectedPath, setSelectedPath] = useState<LearningPathType | null>(
    null,
  );
  const [pathCourses, setPathCourses] = useState<CourseData[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<
    Map<string, { progress: number; completed: boolean }>
  >(new Map());
  const [enrolledPathIds, setEnrolledPathIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        // Load available learning paths
        const paths = await learningPathsAPI.getAll();
        setAvailablePaths(paths);
        const myPaths = await learningPathsAPI.getMyPaths();
        setEnrolledPathIds(new Set(myPaths.map((path) => String(path.id))));

        if (paths.length > 0) {
          // Load first path by default
          const firstPath = paths[0];
          setSelectedPath(firstPath);
          const courses = await learningPathsAPI.getCourses(firstPath.id);
          setPathCourses(courses);
        }

        // Load user's enrolled courses and progress
        const enrollments = await enrollmentsAPI.getMyCourses();
        const progressMap = new Map<
          string,
          { progress: number; completed: boolean }
        >();
        for (const enrollment of enrollments) {
          progressMap.set(enrollment.courseId, {
            progress: enrollment.progress,
            completed: enrollment.progress >= 100,
          });
        }
        setEnrolledCourses(progressMap);
      } catch (err) {
        console.error("Failed to load learning paths:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleSelectPath = async (pathId: string) => {
    const path = availablePaths.find((p) => p.id === pathId);
    if (!path) return;

    setSelectedPath(path);
    try {
      const courses = await learningPathsAPI.getCourses(pathId);
      setPathCourses(courses);
    } catch (err) {
      console.error("Failed to load path courses:", err);
    }
  };

  const handleEnrollInPath = async () => {
    if (!selectedPath) return;
    setEnrolling(true);
    try {
      await learningPathsAPI.enroll(selectedPath.id);
      const myPaths = await learningPathsAPI.getMyPaths();
      setEnrolledPathIds(new Set(myPaths.map((path) => String(path.id))));
      toast({ title: t("path.enrolled") });
    } catch (err: any) {
      console.error("Failed to enroll:", err);
      toast({
        title: err?.message || "Unable to enroll in learning path",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  const calculatePathProgress = () => {
    if (pathCourses.length === 0) return 0;
    let completed = 0;
    pathCourses.forEach((course) => {
      const enrollment = enrolledCourses.get(course.id);
      if (enrollment?.completed) completed++;
    });
    return Math.round((completed / pathCourses.length) * 100);
  };

  const getCourseStatus = (course: CourseData) => {
    const enrollment = enrolledCourses.get(course.id);
    if (!enrollment) return "not-enrolled";
    if (enrollment.completed) return "completed";
    if (enrollment.progress > 0) return "in-progress";
    return "not-started";
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const overallProgress = calculatePathProgress();

  return (
    <>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <MapIcon size={24} className="text-accent" /> {t("path.title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("path.subtitle")}</p>
        </motion.div>

        {/* Path Selector */}
        {availablePaths.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex gap-2 overflow-x-auto pb-2">
              {availablePaths.map((path) => (
                <Button
                  key={path.id}
                  variant={selectedPath?.id === path.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectPath(path.id)}
                  className="whitespace-nowrap"
                >
                  <BookOpen size={14} className="mr-2" />
                  {path.title}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Overall Progress */}
        {selectedPath && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-display font-semibold text-foreground">
                      {selectedPath.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedPath.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-bold text-accent text-2xl">
                      {overallProgress}%
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {t("path.complete")}
                    </p>
                  </div>
                </div>
                <Progress value={overallProgress} className="h-3" />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">
                    <Target size={12} className="inline mr-1" />
                    {
                      pathCourses.filter(
                        (c) => getCourseStatus(c) === "completed",
                      ).length
                    }{" "}
                    of {pathCourses.length} courses completed
                  </p>
                  <Button
                    size="sm"
                    className="gradient-accent text-accent-foreground text-xs"
                    onClick={handleEnrollInPath}
                    disabled={
                      enrolling || enrolledPathIds.has(String(selectedPath.id))
                    }
                  >
                    {enrolling
                      ? t("path.enrolling")
                      : enrolledPathIds.has(String(selectedPath.id))
                        ? t("path.enrolled")
                        : t("path.enroll")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Course Roadmap */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {pathCourses.map((course, i) => {
              const status = getCourseStatus(course);
              const completed = status === "completed";
              const inProgress = status === "in-progress";
              const locked =
                i > 0 &&
                pathCourses[i - 1] &&
                getCourseStatus(pathCourses[i - 1]) !== "completed";

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative flex items-start gap-4 pl-2"
                >
                  {/* Node */}
                  <div
                    className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                      completed
                        ? "bg-success border-success text-success-foreground"
                        : inProgress
                          ? "bg-accent border-accent text-accent-foreground"
                          : "bg-card border-border text-muted-foreground"
                    }`}
                  >
                    {completed ? (
                      <CheckCircle size={16} />
                    ) : locked ? (
                      <Lock size={14} />
                    ) : inProgress ? (
                      <Trophy size={14} />
                    ) : (
                      <Circle size={14} />
                    )}
                  </div>

                  {/* Card */}
                  <Card
                    className={`flex-1 shadow-card ${
                      completed
                        ? "border-success/20"
                        : inProgress
                          ? "border-accent/20"
                          : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-accent">
                              {course.category}
                            </span>
                            {course.difficulty && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium">
                                {course.difficulty}
                              </span>
                            )}
                          </div>
                          <h4 className="font-display font-semibold text-foreground mt-1">
                            {course.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {course.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {completed
                                ? `✅ ${t("path.completed")}`
                                : inProgress
                                  ? `📚 ${t("path.inProgress")}`
                                  : locked
                                    ? `🔒 ${t("path.locked")}`
                                    : `📖 ${t("path.notStarted")}`}
                            </span>
                            {inProgress && (
                              <span className="text-xs font-medium text-accent">
                                {enrolledCourses.get(course.id)?.progress || 0}%
                                complete
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {inProgress && (
                            <Button
                              size="sm"
                              className="gradient-accent text-accent-foreground text-xs"
                              onClick={() => navigate(`/course/${course.id}`)}
                            >
                              {t("path.continue")}{" "}
                              <ArrowRight size={12} className="ml-1" />
                            </Button>
                          )}
                          {status === "not-enrolled" && !locked && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => navigate(`/course/${course.id}`)}
                            >
                              {t("path.viewCourse")}
                            </Button>
                          )}
                          {locked && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs opacity-50 cursor-not-allowed"
                              disabled
                            >
                              <Lock size={12} className="mr-1" />{" "}
                              {t("path.completePrevious")}
                            </Button>
                          )}
                        </div>
                      </div>
                      {inProgress && (
                        <Progress
                          value={enrolledCourses.get(course.id)?.progress || 0}
                          className="h-1.5 mt-3"
                        />
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {pathCourses.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen
                size={48}
                className="mx-auto text-muted-foreground mb-4"
              />
              <h3 className="font-display font-semibold text-lg mb-2">
                {t("path.emptyTitle")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("path.emptyDescription")}
              </p>
              <Button onClick={() => navigate("/browse")}>
                {t("path.browseAll")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default LearningPath;
