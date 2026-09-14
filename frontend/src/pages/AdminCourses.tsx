/**
 * Admin Courses Page - Manage all courses with full editing capabilities
 * Same as instructor course management but for all courses (not just own)
 */
import React, { useEffect, useState } from "react";
import { coursesAPI, CourseData } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Trash2,
  Eye,
  Settings,
  Search,
  PlusCircle,
  GraduationCap,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import CourseCard from "@/components/CourseCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";

const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    courseId: string;
    courseTitle: string;
  }>({ open: false, courseId: "", courseTitle: "" });
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await coursesAPI.getAll();
        setCourses(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const confirmDeleteCourse = (courseId: string, courseTitle: string) => {
    setDeleteConfirm({ open: true, courseId, courseTitle });
  };

  const handleDeleteCourse = async () => {
    if (!deleteConfirm.courseId) return;
    try {
      await coursesAPI.delete(deleteConfirm.courseId);
      setCourses((prev) => prev.filter((c) => c.id !== deleteConfirm.courseId));
      toast({
        title: t("admin.courses.deleted"),
        description: `"${deleteConfirm.courseTitle}" ${t("admin.courses.deletedDescription")}`,
      });
      setDeleteConfirm({ open: false, courseId: "", courseTitle: "" });
    } catch (err: any) {
      toast({
        title: t("admin.courses.deleteError"),
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const filteredCourses = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category?.toLowerCase().includes(search.toLowerCase()) ||
      c.instructorName?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold">
                {t("admin.courses.title")}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t("admin.courses.subtitle")} · {courses.length}{" "}
                {t("admin.courses.count")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/admin/analytics")}
              >
                <GraduationCap size={18} className="mr-2" />{" "}
                {t("admin.courses.analytics")}
              </Button>
              <Button
                onClick={() => navigate("/instructor/add-course")}
                className="gradient-accent text-accent-foreground"
              >
                <PlusCircle size={18} className="mr-2" />{" "}
                {t("admin.courses.add")}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder={t("admin.courses.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {filteredCourses.length} / {courses.length}{" "}
                {t("admin.courses.count")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Courses Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-80 rounded-2xl bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen size={48} className="text-muted-foreground mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                {t("admin.courses.empty")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {search
                  ? t("admin.courses.adjustSearch")
                  : t("admin.courses.addFirst")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group"
              >
                <div className="relative">
                  <CourseCard
                    course={course}
                    onClick={() =>
                      navigate(`/admin/courses/${course.id}/manager`)
                    }
                    index={i}
                  />

                  {/* Admin action buttons on hover */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 text-xs gradient-accent text-accent-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/courses/${course.id}/manager`);
                      }}
                      title={t("admin.courses.manageTitle")}
                    >
                      <Settings size={14} className="mr-1" />{" "}
                      {t("admin.courses.manage")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/course/${course.id}`);
                      }}
                      title={t("admin.courses.view")}
                    >
                      <Eye size={14} className="mr-1" />{" "}
                      {t("admin.courses.view")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeleteCourse(course.id, course.title);
                      }}
                      title={t("admin.courses.delete")}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>

                  {/* Instructor badge */}
                  <div className="absolute bottom-3 left-3">
                    <Badge
                      variant="secondary"
                      className="text-[10px] backdrop-blur-sm bg-background/80"
                    >
                      <GraduationCap size={10} className="mr-1" />
                      {course.instructorName}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Course Confirmation Dialog */}
      <Dialog
        open={deleteConfirm.open}
        onOpenChange={() =>
          setDeleteConfirm({ open: false, courseId: "", courseTitle: "" })
        }
      >
        <DialogContent>
          <DialogHeader>
            <AlertTriangle size={24} className="text-destructive" />
            <DialogTitle className="flex items-center gap-2 text-destructive">
              Delete Course
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteConfirm.courseTitle}</strong>? This action cannot
              be undone and will permanently remove:
              <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                <li>All lessons and videos</li>
                <li>All quizzes and questions</li>
                <li>All student enrollments</li>
                <li>All student progress and certificates</li>
                <li>All discussions and reviews</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDeleteConfirm({ open: false, courseId: "", courseTitle: "" })
              }
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCourse}>
              <Trash2 size={16} className="mr-2" /> Delete Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminCourses;
