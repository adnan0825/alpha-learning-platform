/**
 * Add Course - Comprehensive course creation with tabs for details, lessons, and quizzes
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  coursesAPI,
  quizzesAPI,
  VideoLesson,
  Quiz,
  QuizQuestion,
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
  ChevronUp,
  ChevronDown,
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

interface LessonWithQuiz {
  lesson: VideoLesson;
  quiz?: Quiz;
}

const AddCourse: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Course details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<
    "beginner" | "intermediate" | "advanced"
  >("beginner");
  const [duration, setDuration] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [price, setPrice] = useState(0);

  // Lessons
  const [lessons, setLessons] = useState<LessonWithQuiz[]>([]);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [newLesson, setNewLesson] = useState<VideoLesson>({
    title: "",
    url: "",
    duration: "",
    description: "",
    isFree: false,
  });

  // Quizzes
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizLessonIndex, setQuizLessonIndex] = useState<number | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([
    { id: "1", question: "", options: ["", "", "", ""], correctIndex: 0 },
  ]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: "lesson" | "quiz";
    index: number;
    title: string;
  }>({ open: false, type: "lesson", index: -1, title: "" });

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

  const handleRemoveQuiz = (index: number) => {
    const quizTitle =
      lessons[index].quiz?.title || `Quiz for lesson ${index + 1}`;
    setDeleteConfirm({ open: true, type: "quiz", index, title: quizTitle });
  };

  const confirmRemoveQuiz = () => {
    const updatedLessons = [...lessons];
    updatedLessons[deleteConfirm.index].quiz = undefined;
    setLessons(updatedLessons);
    setDeleteConfirm({ open: false, type: "quiz", index: -1, title: "" });
    toast({ title: t("course.quiz.removed") });
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

  const handleOpenQuizForm = (lessonIndex: number) => {
    const lesson = lessons[lessonIndex];
    setQuizLessonIndex(lessonIndex);
    setQuizTitle(`Quiz: ${lesson.lesson.title}`);
    setQuizQuestions([
      { id: "1", question: "", options: ["", "", "", ""], correctIndex: 0 },
    ]);
    setShowQuizForm(true);
  };

  const handleSaveQuiz = () => {
    if (!quizTitle.trim()) {
      toast({ title: t("course.quiz.titleRequired"), variant: "destructive" });
      return;
    }

    // Store quiz temporarily (will be saved with course creation)
    const updatedLessons = [...lessons];
    const tempQuiz: Quiz = {
      id: `temp_${Date.now()}`,
      courseId: "temp",
      title: quizTitle,
      questions: quizQuestions,
      createdAt: new Date().toISOString(),
    };
    updatedLessons[quizLessonIndex!] = {
      ...updatedLessons[quizLessonIndex!],
      quiz: tempQuiz,
    };
    setLessons(updatedLessons);
    setShowQuizForm(false);
    toast({ title: t("course.quiz.added") });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (lessons.length === 0) {
      toast({
        title: t("course.lessons.none"),
        description: t("course.lessons.noneDescription"),
        variant: "destructive",
      });
      setActiveTab("lessons");
      return;
    }

    setLoading(true);
    try {
      const filteredLessons = lessons.map((l) => l.lesson);

      // Create course
      const createdCourse = await coursesAPI.create({
        title,
        description,
        category,
        thumbnail,
        videoLinks: filteredLessons,
        totalVideos: filteredLessons.length,
        instructorId: user.id,
        instructorName: profile.displayName,
        status: "draft",
        difficulty,
        duration,
        price,
      });

      // Create quizzes for lessons that have them
      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        if (lesson.quiz) {
          try {
            await quizzesAPI.create({
              courseId: createdCourse.id,
              title: lesson.quiz.title,
              questions: lesson.quiz.questions,
            });
          } catch (err) {
            console.error("Failed to create quiz:", err);
          }
        }
      }

      toast({
        title: t("course.create.successTitle"),
        description: t("course.create.successDescription"),
      });
      navigate("/instructor/courses");
    } catch (err: any) {
      toast({
        title: t("course.create.errorTitle"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/instructor/courses")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} /> {t("common.backToCourses")}
          </button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="gradient-accent text-accent-foreground gap-2"
          >
            <Save size={16} />{" "}
            {loading
              ? t("course.create.creating")
              : t("course.create.createCourse")}
          </Button>
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {t("course.create.newTitle")}
          </h1>
          <p className="text-muted-foreground">
            {t("course.create.newSubtitle")}
          </p>
        </div>

        {/* Progress indicator */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div
                className={`flex items-center gap-2 ${activeTab === "details" ? "text-accent" : "text-muted-foreground"}`}
              >
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${activeTab === "details" ? "gradient-accent text-accent-foreground" : "bg-muted"}`}
                >
                  1
                </div>
                <span className="text-sm font-medium">
                  {t("course.form.details")}
                </span>
              </div>
              <div className="h-px w-8 bg-border" />
              <div
                className={`flex items-center gap-2 ${activeTab === "lessons" ? "text-accent" : "text-muted-foreground"}`}
              >
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${activeTab === "lessons" ? "gradient-accent text-accent-foreground" : "bg-muted"}`}
                >
                  2
                </div>
                <span className="text-sm font-medium">
                  {t("course.form.lessons")} ({lessons.length})
                </span>
              </div>
              <div className="h-px w-8 bg-border" />
              <div
                className={`flex items-center gap-2 ${activeTab === "quizzes" ? "text-accent" : "text-muted-foreground"}`}
              >
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${activeTab === "quizzes" ? "gradient-accent text-accent-foreground" : "bg-muted"}`}
                >
                  3
                </div>
                <span className="text-sm font-medium">
                  {t("course.form.quizzes")} (
                  {lessons.filter((l) => l.quiz).length})
                </span>
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
              <ClipboardList size={16} /> Quizzes (
              {lessons.filter((l) => l.quiz).length})
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

                <div className="space-y-2">
                  <Label htmlFor="title">Course Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Complete Web Development Bootcamp"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
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
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={category}
                      onValueChange={setCategory}
                      required
                    >
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
                    <Label htmlFor="difficulty">Difficulty *</Label>
                    <Select
                      value={difficulty}
                      onValueChange={(v) => setDifficulty(v as any)}
                      required
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
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g., 6h 30m"
                    />
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
                                  Lesson Description
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
                                  placeholder="What will students learn in this lesson?"
                                  rows={2}
                                  className="text-sm"
                                />
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2 space-y-1">
                                  <Label className="text-xs font-semibold">
                                    Video URL
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
                                    onClick={() => handleOpenQuizForm(index)}
                                    className="h-7 text-xs"
                                  >
                                    <PlusCircle size={12} className="mr-1" />{" "}
                                    Edit Quiz
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveQuiz(index)}
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
                                  Quiz
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
            {lessons.filter((l) => l.quiz).length === 0 ? (
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
                    Add quizzes to lessons from the Lessons tab
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {lessons
                  .filter((l) => l.quiz)
                  .map((item, index) => (
                    <Card key={item.quiz?.id} className="shadow-card">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-display font-semibold text-foreground">
                              {item.quiz?.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Lesson{" "}
                              {lessons.findIndex(
                                (l) => l.quiz?.id === item.quiz?.id,
                              ) + 1}{" "}
                              • {item.quiz?.questions.length} questions
                            </p>
                          </div>
                          <Badge variant="outline">Quiz</Badge>
                        </div>
                        <div className="space-y-2">
                          {item.quiz?.questions.slice(0, 3).map((q, i) => (
                            <div
                              key={q.id}
                              className="text-sm p-3 rounded-lg bg-muted/50"
                            >
                              <span className="font-medium">Q{i + 1}:</span>{" "}
                              {q.question}
                            </div>
                          ))}
                          {item.quiz && item.quiz.questions.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{item.quiz.questions.length - 3} more questions
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
                      className="gradient-accent text-accent-foreground"
                    >
                      Save Quiz
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
                  : confirmRemoveQuiz
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

export default AddCourse;
