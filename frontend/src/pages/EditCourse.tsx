/**
 * Edit Course - Instructor form to edit course details and video lessons.
 */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { coursesAPI, VideoLesson, CourseData } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

import ImageUpload from "@/components/ImageUpload";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, X, ArrowLeft, Save, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const categories = [
  "Programming",
  "Design",
  "Business",
  "Marketing",
  "Data Science",
  "DevOps",
  "Mobile",
  "Other",
];
const difficulties = ["beginner", "intermediate", "advanced"] as const;
const statuses = ["published", "draft", "archived"] as const;

const EditCourse: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<
    "beginner" | "intermediate" | "advanced"
  >("beginner");
  const [duration, setDuration] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [status, setStatus] = useState<"published" | "draft" | "archived">(
    "published",
  );
  const [price, setPrice] = useState(0);
  const [introVideoUrl, setIntroVideoUrl] = useState("");
  const [introVideoTitle, setIntroVideoTitle] = useState("");
  const [lessons, setLessons] = useState<VideoLesson[]>([
    { title: "", url: "", duration: "" },
  ]);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      try {
        const course = await coursesAPI.getById(courseId);
        if (course) {
          setTitle(course.title);
          setDescription(course.description);
          setCategory(course.category);
          setDifficulty(course.difficulty);
          setDuration(course.duration);
          setThumbnail(course.thumbnail);
          setStatus(course.status);
          setPrice(course.price || 0);
          setIntroVideoUrl(course.introVideoUrl?.trim() || "");
          setIntroVideoTitle(course.introVideoTitle?.trim() || "");
          setLessons(
            course.videoLinks.length > 0
              ? course.videoLinks
              : [{ title: "", url: "", duration: "" }],
          );
        }
      } catch (err: any) {
        toast({
          title: "Error loading course",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId]);

  const addLesson = () =>
    setLessons([...lessons, { title: "", url: "", duration: "" }]);
  const removeLesson = (index: number) =>
    setLessons(lessons.filter((_, i) => i !== index));
  const updateLesson = (
    index: number,
    field: keyof VideoLesson,
    value: string,
  ) => {
    const updated = [...lessons];
    updated[index] = { ...updated[index], [field]: value };
    setLessons(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const filteredLessons = lessons.filter(
      (l) => l.url.trim() !== "" || l.title.trim() !== "",
    );
    try {
      await coursesAPI.update(courseId!, {
        title,
        description,
        category,
        thumbnail,
        introVideoUrl: introVideoUrl.trim(),
        introVideoTitle: introVideoTitle.trim(),
        videoLinks: filteredLessons,
        totalVideos: filteredLessons.length,
        status,
        difficulty,
        duration,
        price,
      });
      toast({ title: "Course updated successfully!" });
      navigate("/instructor/courses");
    } catch (err: any) {
      toast({
        title: "Error updating course",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-accent" />
      </div>
    );
  }

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/instructor/courses/${courseId}/manager`)}
            className="gap-1"
          >
            <Settings size={14} /> Full Course Manager
          </Button>
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Edit Course
          </h1>
          <p className="text-muted-foreground">
            Update course details, thumbnail, and video lessons
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="shadow-card mb-6">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="thumbnail">Course Thumbnail</Label>
                <ImageUpload
                  value={thumbnail}
                  onChange={setThumbnail}
                  label="Upload thumbnail"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Complete Web Development Bootcamp"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will students learn from this course?"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={difficulty}
                    onValueChange={(v) => setDifficulty(v as any)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {difficulties.map((d) => (
                        <SelectItem key={d} value={d} className="capitalize">
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as any)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (ETB)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    placeholder="0 for free"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g., 6h 30m"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card mb-6">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-foreground">
                  Video Lessons
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLesson}
                  className="gap-1"
                >
                  <PlusCircle size={14} /> Add Lesson
                </Button>
              </div>

              {lessons.map((lesson, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-border bg-muted/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Lesson {index + 1}
                    </span>
                    {lessons.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLesson(index)}
                        className="h-6 w-6 text-destructive hover:text-destructive"
                      >
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-xs">Lesson Title</Label>
                      <Input
                        value={lesson.title}
                        onChange={(e) =>
                          updateLesson(index, "title", e.target.value)
                        }
                        placeholder="Lesson title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Duration</Label>
                      <Input
                        value={lesson.duration}
                        onChange={(e) =>
                          updateLesson(index, "duration", e.target.value)
                        }
                        placeholder="e.g., 15m"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">
                      Video URL (YouTube, Vimeo, etc.)
                    </Label>
                    <Input
                      value={lesson.url}
                      onChange={(e) =>
                        updateLesson(index, "url", e.target.value)
                      }
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 gradient-accent text-accent-foreground font-semibold h-11 hover:opacity-90 gap-2"
            >
              <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/instructor/courses")}
              className="h-11"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default EditCourse;
