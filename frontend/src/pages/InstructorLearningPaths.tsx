/**
 * Instructor Learning Paths - Create and link course sequences.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  coursesAPI,
  CourseData,
  learningPathsAPI,
  LearningPath as LearningPathType,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Map, Pencil, PlusCircle, Trash2 } from "lucide-react";

const InstructorLearningPaths: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [courses, setCourses] = useState<CourseData[]>([]);
  const [recentPaths, setRecentPaths] = useState<LearningPathType[]>([]);
  const [pathTitle, setPathTitle] = useState("");
  const [pathDescription, setPathDescription] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [editingPathId, setEditingPathId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!user) return;

    try {
      const [instructorCourses, myPaths] = await Promise.all([
        coursesAPI.getByInstructor(user.id),
        learningPathsAPI.getMine(),
      ]);
      setCourses(instructorCourses);
      setRecentPaths(myPaths);
    } catch (error) {
      console.error("Failed to load learning path data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const resetForm = () => {
    setPathTitle("");
    setPathDescription("");
    setSelectedCourseIds([]);
    setEditingPathId(null);
    setShowForm(false);
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourseIds((current) =>
      current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId],
    );
  };

  const handleEditPath = async (path: LearningPathType) => {
    try {
      const pathCourses = await learningPathsAPI.getCourses(path.id);
      setEditingPathId(path.id);
      setPathTitle(path.title);
      setPathDescription(path.description || "");
      setSelectedCourseIds(pathCourses.map((course) => course.id));
      setShowForm(true);
    } catch (error) {
      console.error("Failed to load path details:", error);
      toast({
        title: "Unable to load learning path",
        variant: "destructive",
      });
    }
  };

  const handleDeletePath = async (pathId: string) => {
    try {
      await learningPathsAPI.delete(pathId);
      toast({ title: "Learning path deleted" });
      await loadData();
      if (editingPathId === pathId) {
        resetForm();
      }
    } catch (error: any) {
      toast({
        title: error?.message || "Unable to delete learning path",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!pathTitle.trim()) {
      toast({
        title: "Path title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      if (editingPathId) {
        await learningPathsAPI.update(editingPathId, {
          title: pathTitle.trim(),
          description: pathDescription.trim(),
          courseIds: selectedCourseIds.map(Number),
        });
        toast({ title: "Learning path updated" });
      } else {
        await learningPathsAPI.create({
          title: pathTitle.trim(),
          description: pathDescription.trim(),
          courseIds: selectedCourseIds.map(Number),
        });
        toast({ title: "Learning path created" });
      }

      resetForm();
      await loadData();
    } catch (error: any) {
      toast({
        title: error?.message || "Unable to save learning path",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
            <Map size={14} /> Learning paths
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {showForm
              ? editingPathId
                ? "Edit learning path"
                : "Create learning path"
              : "Learning paths"}
          </h1>
        </div>

        <Button
          onClick={() => {
            setPathTitle("");
            setPathDescription("");
            setSelectedCourseIds([]);
            setEditingPathId(null);
            setShowForm(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="shrink-0"
        >
          <PlusCircle size={16} className="mr-2" />
          Create learning path
        </Button>
      </div>

      {showForm && (
        <Card className="shadow-card">
          <CardContent className="space-y-5 p-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Path title
              </label>
              <Input
                value={pathTitle}
                onChange={(event) => setPathTitle(event.target.value)}
                placeholder="e.g. Frontend Foundation"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Description
              </label>
              <Textarea
                value={pathDescription}
                onChange={(event) => setPathDescription(event.target.value)}
                placeholder="Describe the learning goal and audience for this path"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Link your courses
              </label>

              {loading ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                  Loading your courses...
                </div>
              ) : courses.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                  You have no courses yet. Create a course first, then build a
                  path.
                </div>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {courses.map((course) => (
                    <label
                      key={course.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCourseIds.includes(course.id)}
                        onChange={() => toggleCourseSelection(course.id)}
                        className="h-4 w-4 accent-accent"
                      />
                      <span className="line-clamp-1">{course.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {editingPathId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Cancel edit
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => navigate("/instructor/dashboard")}
              >
                Back to dashboard
              </Button>
              <Button onClick={handleSubmit} disabled={submitting || loading}>
                <PlusCircle size={16} className="mr-2" />
                {submitting
                  ? editingPathId
                    ? "Updating..."
                    : "Creating..."
                  : editingPathId
                    ? "Update learning path"
                    : "Save learning path"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Recent learning paths
            </h2>
          </div>

          {recentPaths.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No recent learning paths yet. Create one using the button above.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recentPaths.map((path) => (
                <div
                  key={path.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {path.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {path.courseCount || 0} course
                        {path.courseCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="rounded-full bg-accent/10 px-2 py-1 text-xs text-accent">
                      {path.isActive ? "Active" : "Draft"}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {path.description || "No description provided."}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPath(path)}
                    >
                      <Pencil size={14} className="mr-2" />
                      Edit learning path
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePath(path.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 size={14} className="mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InstructorLearningPaths;
