/**
 * Course Manager - Comprehensive course management with lessons, quizzes, and details
 */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  coursesAPI,
  quizzesAPI,
  Quiz,
  QuizQuestion,
  CourseData,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PlusCircle,
  X,
  ArrowLeft,
  Save,
  Video,
  ClipboardList,
  Settings,
  Trash2,
  Edit3,
  ChevronUp,
  ChevronDown,
  PlayCircle,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const categoryLabels = [
  { value: "Programming", labelKey: "course.categoryProgramming" },
  { value: "Design", labelKey: "course.categoryDesign" },
  { value: "Business", labelKey: "course.categoryBusiness" },
  { value: "Marketing", labelKey: "course.categoryMarketing" },
  { value: "Data Science", labelKey: "course.categoryDataScience" },
  { value: "DevOps", labelKey: "course.categoryDevops" },
  { value: "Mobile", labelKey: "course.categoryMobile" },
  { value: "Other", labelKey: "course.categoryOther" },
] as const;
const difficultyLabels = [
  { value: "beginner", labelKey: "course.beginnerLevel" },
  { value: "intermediate", labelKey: "course.intermediateLevel" },
  { value: "advanced", labelKey: "course.advancedLevel" },
] as const;
const statuses = ["published", "draft", "archived"] as const;

interface VideoLesson {
  title: string;
  url: string;
  duration?: string;
  description?: string;
  isFree?: boolean;
}

interface LessonWithQuiz {
  lesson: VideoLesson;
  quiz?: Quiz;
}

const CourseManager: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Course details state
  const [course, setCourse] = useState<CourseData | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<
    "beginner" | "intermediate" | "advanced"
  >("beginner");
  const [duration, setDuration] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [status, setStatus] = useState<"published" | "draft" | "archived">(
    "draft",
  );
  const [price, setPrice] = useState(0);
  const [introVideoUrl, setIntroVideoUrl] = useState("");
  const [introVideoTitle, setIntroVideoTitle] = useState("");

  // Lessons state
  const [lessons, setLessons] = useState<LessonWithQuiz[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: "lesson" | "quiz";
    index: number;
    title: string;
  }>({ open: false, type: "lesson", index: -1, title: "" });

  // New lesson form
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [newLesson, setNewLesson] = useState<VideoLesson>({
    title: "",
    url: "",
    duration: "",
    description: "",
    isFree: false,
  });

  // New quiz form
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizLessonIndex, setQuizLessonIndex] = useState<number | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([
    { id: "1", question: "", options: ["", "", "", ""], correctIndex: 0 },
  ]);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      try {
        const [courseData, quizzesData] = await Promise.all([
          coursesAPI.getById(courseId),
          quizzesAPI.getByCourse(courseId),
        ]);

        if (courseData) {
          setCourse(courseData);
          setTitle(courseData.title);
          setDescription(courseData.description);
          setCategory(courseData.category);
          setDifficulty(courseData.difficulty);
          setDuration(courseData.duration);
          setThumbnail(courseData.thumbnail);
          setStatus(courseData.status);
          setPrice(courseData.price || 0);
          setIntroVideoUrl(courseData.introVideoUrl?.trim() || "");
          setIntroVideoTitle(courseData.introVideoTitle?.trim() || "");

          // Map lessons with their quizzes
          const lessonsWithQuizzes: LessonWithQuiz[] =
            courseData.videoLinks.map((lesson) => ({
              lesson,
              quiz: quizzesData.find((q) => {
                // Match quiz to lesson by title or index
                const quizLessonMatch = q.title
                  .toLowerCase()
                  .includes(lesson.title.toLowerCase());
                return quizLessonMatch;
              }),
            }));
          setLessons(lessonsWithQuizzes);
          setQuizzes(quizzesData);
        }
      } catch (err: any) {
        toast({
          title: t("course.load.errorTitle"),
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId]);

  // ============ COURSE DETAILS ============
  const handleSaveCourse = async () => {
    if (!courseId) return;
    setSaving(true);
    try {
      await coursesAPI.update(courseId, {
        title,
        description,
        category,
        thumbnail,
        introVideoUrl: introVideoUrl.trim(),
        introVideoTitle: introVideoTitle.trim(),
        videoLinks: lessons.map((l) => l.lesson),
        totalVideos: lessons.length,
        status,
        difficulty,
        duration,
        price,
      });
      toast({ title: t("course.save.successTitle") });
    } catch (err: any) {
      toast({
        title: t("course.save.errorTitle"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ============ LESSONS ============
  const handleAddLesson = () => {
    if (!newLesson.title.trim() || !newLesson.url.trim()) {
      toast({
        title: t("course.add.missingFields"),
        description: t("course.add.missingFieldsDescription"),
        variant: "destructive",
      });
      return;
    }
    setLessons([...lessons, { lesson: { ...newLesson } }]);
    setNewLesson({
      title: "",
      url: "",
      duration: "",
      description: "",
      isFree: false,
    });
    setShowLessonForm(false);
  };

  const handleRemoveLesson = (index: number) => {
    const lessonTitle = lessons[index].lesson.title || `Lesson ${index + 1}`;
    setDeleteConfirm({ open: true, type: "lesson", index, title: lessonTitle });
  };

  const confirmRemoveLesson = () => {
    setLessons(lessons.filter((_, i) => i !== deleteConfirm.index));
    setDeleteConfirm({ open: false, type: "lesson", index: -1, title: "" });
    toast({ title: t("course.lesson.removed") });
  };

  const handleDeleteQuiz = (lessonIndex: number, quizId: string) => {
    const quizTitle =
      lessons[lessonIndex].quiz?.title || `Quiz for lesson ${lessonIndex + 1}`;
    setDeleteConfirm({
      open: true,
      type: "quiz",
      index: lessonIndex,
      title: quizTitle,
    });
  };

  const confirmDeleteQuiz = () => {
    const updatedLessons = [...lessons];
    updatedLessons[deleteConfirm.index].quiz = undefined;
    setLessons(updatedLessons);
    setDeleteConfirm({ open: false, type: "quiz", index: -1, title: "" });
    toast({ title: t("course.quiz.removedFromLesson") });
  };

  const handleMoveLesson = (index: number, direction: "up" | "down") => {
    const newLessons = [...lessons];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newLessons.length) return;
    [newLessons[index], newLessons[newIndex]] = [
      newLessons[newIndex],
      newLessons[index],
    ];
    setLessons(newLessons);
  };

  const handleUpdateLesson = (
    index: number,
    field: keyof VideoLesson,
    value: any,
  ) => {
    const updated = [...lessons];
    updated[index] = {
      ...updated[index],
      lesson: { ...updated[index].lesson, [field]: value },
    };
    setLessons(updated);
  };

  // ============ QUIZZES ============
  const handleOpenQuizForm = (lessonIndex: number) => {
    const lesson = lessons[lessonIndex];
    setQuizLessonIndex(lessonIndex);
    setQuizTitle(`Quiz: ${lesson.lesson.title}`);
    setQuizQuestions([
      { id: "1", question: "", options: ["", "", "", ""], correctIndex: 0 },
    ]);
    setShowQuizForm(true);
  };

  const handleSaveQuiz = async () => {
    if (!courseId || quizLessonIndex === null) return;
    if (!quizTitle.trim()) {
      toast({ title: t("course.quiz.titleRequired"), variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Check if quiz already exists for this lesson
      const existingQuiz = lessons[quizLessonIndex].quiz;

      if (existingQuiz) {
        // Update existing quiz (would need backend endpoint)
        toast({
          title: t("course.quiz.updateSoon"),
          description: t("course.quiz.updateSoonDescription"),
        });
      } else {
        // Create new quiz
        await quizzesAPI.create({
          courseId,
          title: quizTitle,
          questions: quizQuestions,
        });
        toast({ title: t("course.quiz.createdSuccess") });

        // Refresh quizzes
        const updatedQuizzes = await quizzesAPI.getByCourse(courseId);
        setQuizzes(updatedQuizzes);

        // Update lessons with quiz
        const updatedLessons = [...lessons];
        const newQuiz = updatedQuizzes.find((q) => q.title === quizTitle);
        updatedLessons[quizLessonIndex] = {
          ...updatedLessons[quizLessonIndex],
          quiz: newQuiz,
        };
        setLessons(updatedLessons);
      }

      setShowQuizForm(false);
    } catch (err: any) {
      toast({
        title: t("course.quiz.saveError"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    setQuizQuestions([
      ...quizQuestions,
      {
        id: Date.now().toString(),
        question: "",
        options: ["", "", "", ""],
        correctIndex: 0,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (quizQuestions.length <= 1) return;
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
  };

  const updateQuestion = (
    index: number,
    field: keyof QuizQuestion,
    value: any,
  ) => {
    const updated = [...quizQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setQuizQuestions(updated);
  };

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    value: string,
  ) => {
    const updated = [...quizQuestions];
    updated[questionIndex].options[optionIndex] = value;
    setQuizQuestions(updated);
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
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                // Go back to appropriate courses page based on user role
                if (user?.role === "admin") {
                  navigate("/admin/courses");
                } else {
                  navigate("/instructor/courses");
                }
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={16} /> Back to Courses
            </button>
            <div className="h-6 w-px bg-border" />
            <button
              onClick={() => navigate(`/course/${courseId}`)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <PlayCircle size={16} /> View Course
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (user?.role === "admin") {
                  navigate(`/admin/courses/${courseId}`);
                } else {
                  navigate(`/instructor/courses/${courseId}/edit`);
                }
              }}
              className="gap-2"
            >
              <Edit3 size={16} /> Quick Edit
            </Button>
            <Button
              onClick={handleSaveCourse}
              disabled={saving}
              className="gradient-accent text-accent-foreground gap-2"
            >
              <Save size={16} /> {saving ? "Saving..." : "Save All Changes"}
            </Button>
          </div>
        </div>

        {/* Course Info Banner */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {thumbnail && (
                <img
                  src={thumbnail}
                  alt={title}
                  className="w-32 h-20 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {title || "Untitled Course"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {lessons.length} lessons • {quizzes.length} quizzes
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant={status === "published" ? "default" : "secondary"}
                  >
                    {status}
                  </Badge>
                  <Badge variant="outline">{category}</Badge>
                  <Badge variant="outline" className="capitalize">
                    {difficulty}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="details" className="gap-2">
              <Settings size={16} /> Course Details
            </TabsTrigger>
            <TabsTrigger value="lessons" className="gap-2">
              <Video size={16} /> Lessons ({lessons.length})
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="gap-2">
              <ClipboardList size={16} /> Quizzes ({quizzes.length})
            </TabsTrigger>
          </TabsList>

          {/* ========== COURSE DETAILS TAB ========== */}
          <TabsContent value="details" className="space-y-6 mt-6">
            <Card className="shadow-card">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="thumbnail">Course Thumbnail</Label>
                  <ImageUpload
                    value={thumbnail}
                    onChange={setThumbnail}
                    label="Upload thumbnail"
                  />
                </div>

                <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-4">
                  <Label htmlFor="cm-intro-url">
                    Free intro video (optional)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Public preview before enrollment. If empty, the first lesson
                    in the Lessons tab is the free preview.
                  </p>
                  <Input
                    id="cm-intro-url"
                    value={introVideoUrl}
                    onChange={(e) => setIntroVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  <Label htmlFor="cm-intro-title" className="pt-2 block">
                    Intro title (optional)
                  </Label>
                  <Input
                    id="cm-intro-title"
                    value={introVideoTitle}
                    onChange={(e) => setIntroVideoTitle(e.target.value)}
                    placeholder="e.g., Welcome to this course"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Course Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Complete Web Development Bootcamp"
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
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryLabels.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {t(cat.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select
                      value={difficulty}
                      onValueChange={(v) => setDifficulty(v as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {difficultyLabels.map((d) => (
                          <SelectItem
                            key={d.value}
                            value={d.value}
                            className="capitalize"
                          >
                            {t(d.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={status}
                      onValueChange={(v) => setStatus(v as any)}
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
          </TabsContent>

          {/* ========== LESSONS TAB ========== */}
          <TabsContent value="lessons" className="space-y-6 mt-6">
            {/* Add Lesson Form */}
            {!showLessonForm ? (
              <Button
                onClick={() => setShowLessonForm(true)}
                variant="outline"
                className="w-full border-dashed h-12"
              >
                <PlusCircle size={18} className="mr-2" /> Add New Lesson
              </Button>
            ) : (
              <Card className="shadow-card border-accent/20">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-foreground">
                      Add New Lesson
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowLessonForm(false)}
                    >
                      <X size={18} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>Lesson Title *</Label>
                      <Input
                        value={newLesson.title}
                        onChange={(e) =>
                          setNewLesson({ ...newLesson, title: e.target.value })
                        }
                        placeholder="e.g., Introduction to React"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Video URL *</Label>
                      <Input
                        value={newLesson.url}
                        onChange={(e) =>
                          setNewLesson({ ...newLesson, url: e.target.value })
                        }
                        placeholder="https://youtube.com/watch?v=... or Vimeo URL"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Duration</Label>
                        <Input
                          value={newLesson.duration}
                          onChange={(e) =>
                            setNewLesson({
                              ...newLesson,
                              duration: e.target.value,
                            })
                          }
                          placeholder="e.g., 15m"
                        />
                      </div>
                      <div className="space-y-2 flex items-end">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={newLesson.isFree}
                            onCheckedChange={(checked) =>
                              setNewLesson({ ...newLesson, isFree: checked })
                            }
                          />
                          <Label className="text-sm">Free preview</Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Lesson Description</Label>
                      <Textarea
                        value={newLesson.description}
                        onChange={(e) =>
                          setNewLesson({
                            ...newLesson,
                            description: e.target.value,
                          })
                        }
                        placeholder="What will students learn in this lesson?"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleAddLesson}
                      className="gradient-accent text-accent-foreground"
                    >
                      Add Lesson
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowLessonForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lessons List */}
            {lessons.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Video size={48} className="text-muted-foreground mb-4" />
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                    No lessons yet
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Add your first lesson to get started
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {lessons.map((item, index) => (
                  <Card key={index} className="shadow-card">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Drag handles */}
                        <div className="flex flex-col gap-1 pt-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMoveLesson(index, "up")}
                            disabled={index === 0}
                          >
                            <ChevronUp size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMoveLesson(index, "down")}
                            disabled={index === lessons.length - 1}
                          >
                            <ChevronDown size={14} />
                          </Button>
                        </div>

                        {/* Lesson number */}
                        <div className="h-10 w-10 rounded-full gradient-accent flex items-center justify-center text-accent-foreground text-sm font-bold flex-shrink-0">
                          {index + 1}
                        </div>

                        {/* Lesson content */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold">
                                  Lesson Title
                                </Label>
                                <Input
                                  value={item.lesson.title}
                                  onChange={(e) =>
                                    handleUpdateLesson(
                                      index,
                                      "title",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Lesson title"
                                  className="font-semibold"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold">
                                  Lesson Description (details about this lesson)
                                </Label>
                                <Textarea
                                  value={item.lesson.description || ""}
                                  onChange={(e) =>
                                    handleUpdateLesson(
                                      index,
                                      "description",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="What will students learn in this lesson? Add detailed description here..."
                                  rows={3}
                                  className="text-sm"
                                />
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2 space-y-1">
                                  <Label className="text-xs font-semibold">
                                    Video URL (YouTube, Vimeo, etc.)
                                  </Label>
                                  <Input
                                    value={item.lesson.url}
                                    onChange={(e) =>
                                      handleUpdateLesson(
                                        index,
                                        "url",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="https://youtube.com/watch?v=..."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-semibold">
                                    Duration
                                  </Label>
                                  <Input
                                    value={item.lesson.duration || ""}
                                    onChange={(e) =>
                                      handleUpdateLesson(
                                        index,
                                        "duration",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="e.g., 15m"
                                  />
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveLesson(index)}
                              className="text-destructive hover:text-destructive flex-shrink-0 mt-6"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>

                          {/* Quiz section */}
                          <div className="bg-muted/50 rounded-lg p-3 border border-border">
                            <div className="flex items-center gap-2 mb-2">
                              <ClipboardList
                                size={16}
                                className="text-accent"
                              />
                              <span className="text-sm font-semibold">
                                Quiz for this lesson
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.quiz ? (
                                <>
                                  <Badge variant="default" className="gap-1">
                                    <ClipboardList size={12} />
                                    {item.quiz.questions.length} questions
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      handleOpenQuizForm(index);
                                      setQuizTitle(
                                        item.quiz?.title ||
                                          `Quiz: ${item.lesson.title}`,
                                      );
                                      if (item.quiz) {
                                        setQuizQuestions(item.quiz.questions);
                                      }
                                    }}
                                    className="h-7 text-xs"
                                  >
                                    <Edit3 size={12} className="mr-1" /> Edit
                                    Quiz
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleDeleteQuiz(index, item.quiz!.id)
                                    }
                                    className="h-7 text-xs text-destructive"
                                  >
                                    <Trash2 size={12} className="mr-1" /> Remove
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenQuizForm(index)}
                                  className="h-7 text-xs"
                                >
                                  <PlusCircle size={12} className="mr-1" /> Add
                                  Quiz to this lesson
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ========== QUIZZES TAB ========== */}
          <TabsContent value="quizzes" className="space-y-6 mt-6">
            {quizzes.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <ClipboardList
                    size={48}
                    className="text-muted-foreground mb-4"
                  />
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                    No quizzes yet
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Add quizzes to lessons to test student knowledge
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {quizzes.map((quiz, index) => (
                  <Card key={quiz.id} className="shadow-card">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-display font-semibold text-foreground">
                            {quiz.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {quiz.questions.length} questions
                          </p>
                        </div>
                        <Badge variant="outline">
                          {new Date(quiz.createdAt).toLocaleDateString()}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {quiz.questions.slice(0, 3).map((q, i) => (
                          <div
                            key={q.id}
                            className="text-sm p-3 rounded-lg bg-muted/50"
                          >
                            <span className="font-medium">Q{i + 1}:</span>{" "}
                            {q.question}
                          </div>
                        ))}
                        {quiz.questions.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{quiz.questions.length - 3} more questions
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Quiz Form Modal */}
            {showQuizForm && (
              <Card className="shadow-card border-accent/20">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-foreground">
                      {quizLessonIndex !== null && lessons[quizLessonIndex]
                        ? `Add Quiz: ${lessons[quizLessonIndex].lesson.title}`
                        : "Add Quiz"}
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowQuizForm(false)}
                    >
                      <X size={18} />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Quiz Title</Label>
                    <Input
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder="e.g., Introduction to React - Quiz"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Questions</Label>
                      <Button variant="outline" size="sm" onClick={addQuestion}>
                        <PlusCircle size={14} className="mr-1" /> Add Question
                      </Button>
                    </div>

                    {quizQuestions.map((q, qIndex) => (
                      <Card key={q.id} className="border">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">
                              Question {qIndex + 1}
                            </Label>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeQuestion(qIndex)}
                              disabled={quizQuestions.length <= 1}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>

                          <Textarea
                            value={q.question}
                            onChange={(e) =>
                              updateQuestion(qIndex, "question", e.target.value)
                            }
                            placeholder="Enter your question"
                            rows={2}
                          />

                          <div className="grid grid-cols-2 gap-2">
                            {q.options.map((option, oIndex) => (
                              <div
                                key={oIndex}
                                className="flex items-center gap-2"
                              >
                                <Switch
                                  checked={q.correctIndex === oIndex}
                                  onCheckedChange={() =>
                                    updateQuestion(
                                      qIndex,
                                      "correctIndex",
                                      oIndex,
                                    )
                                  }
                                />
                                <Input
                                  value={option}
                                  onChange={(e) =>
                                    updateOption(qIndex, oIndex, e.target.value)
                                  }
                                  placeholder={`Option ${oIndex + 1}`}
                                  className="text-sm"
                                />
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Toggle the switch for the correct answer
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveQuiz}
                      disabled={saving}
                      className="gradient-accent text-accent-foreground"
                    >
                      {saving ? "Saving..." : "Save Quiz"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowQuizForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm.open}
        onOpenChange={() => setDeleteConfirm({ ...deleteConfirm, open: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle size={20} className="text-destructive" />
              {deleteConfirm.type === "lesson"
                ? "Delete Lesson"
                : "Remove Quiz"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to{" "}
              {deleteConfirm.type === "lesson" ? "delete" : "remove"}{" "}
              <strong>{deleteConfirm.title}</strong>?
              {deleteConfirm.type === "lesson"
                ? " This will permanently remove the lesson, its video, description, and any associated quiz."
                : " This will permanently remove the quiz and all its questions from this lesson."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDeleteConfirm({ ...deleteConfirm, open: false })
              }
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={
                deleteConfirm.type === "lesson"
                  ? confirmRemoveLesson
                  : confirmDeleteQuiz
              }
            >
              <Trash2 size={16} className="mr-2" />{" "}
              {deleteConfirm.type === "lesson"
                ? "Delete Lesson"
                : "Remove Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CourseManager;
