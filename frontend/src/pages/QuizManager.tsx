/**
 * Instructor Quiz Manager - Create, edit, and manage quizzes.
 */
import React, { useEffect, useState } from "react";
import { coursesAPI, quizzesAPI, CourseData, Quiz } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  FileQuestion,
  Plus,
  Trash2,
  CheckCircle,
  BookOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const QuizManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [questions, setQuestions] = useState<
    { question: string; options: string[]; correctIndex: number }[]
  >([{ question: "", options: ["", "", ""], correctIndex: 0 }]);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      try {
        const c =
          user.role === "admin"
            ? await coursesAPI.getAll()
            : await coursesAPI.getByInstructor(user.id);
        setCourses(c);
        if (c.length > 0) {
          setSelectedCourse(c[0].id);
          const q = await quizzesAPI.getByCourse(c[0].id, true);
          setQuizzes(q);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user]);

  const loadQuizzes = async (courseId: string) => {
    setSelectedCourse(courseId);
    const q = await quizzesAPI.getByCourse(courseId, true);
    setQuizzes(q);
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { question: "", options: ["", "", "", ""], correctIndex: 0 },
    ]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)),
    );
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) }
          : q,
      ),
    );
  };

  const resetForm = () => {
    setShowCreate(false);
    setEditingQuizId(null);
    setNewTitle("");
    setQuestions([
      { question: "", options: ["", "", "", ""], correctIndex: 0 },
    ]);
  };

  const startEditQuiz = (quiz: Quiz) => {
    setEditingQuizId(quiz.id);
    setNewTitle(quiz.title);
    setQuestions(
      quiz.questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
      })),
    );
    setShowCreate(true);
  };

  const toggleQuizStatus = async (quizId: string, nextIsActive: boolean) => {
    try {
      const updated = await quizzesAPI.setActive(quizId, nextIsActive);
      setQuizzes((prev) =>
        prev.map((quiz) =>
          quiz.id === quizId
            ? { ...quiz, isActive: updated.isActive ?? nextIsActive }
            : quiz,
        ),
      );
      toast({ title: nextIsActive ? "Quiz activated" : "Quiz deactivated" });
      if (editingQuizId === quizId) {
        resetForm();
      }
    } catch (err: any) {
      toast({
        title: nextIsActive
          ? "Failed to activate quiz"
          : "Failed to deactivate quiz",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const createQuiz = async () => {
    if (!newTitle.trim() || !selectedCourse) return;

    try {
      if (editingQuizId) {
        const updated = await quizzesAPI.update(editingQuizId, {
          courseId: selectedCourse,
          title: newTitle,
          questions: questions.map((q, i) => ({ id: `q${i}`, ...q })),
        });

        setQuizzes((prev) =>
          prev.map((quiz) => (quiz.id === editingQuizId ? updated : quiz)),
        );
        toast({ title: "Quiz updated" });
      } else {
        const quiz = await quizzesAPI.create({
          courseId: selectedCourse,
          title: newTitle,
          questions: questions.map((q, i) => ({ id: `q${i}`, ...q })),
        });
        setQuizzes((prev) => [...prev, quiz]);
        toast({ title: t("quiz.created") });
      }

      resetForm();
    } catch (err: any) {
      console.error(err);
      toast({
        title: editingQuizId
          ? "Failed to update quiz"
          : "Failed to create quiz",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <FileQuestion size={24} className="text-accent" />{" "}
              {t("quiz.title")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("quiz.subtitle")}
            </p>
          </div>
          <Button
            onClick={() => {
              if (showCreate && editingQuizId) {
                resetForm();
                return;
              }
              setShowCreate(!showCreate);
              if (!showCreate) {
                setEditingQuizId(null);
                setNewTitle("");
                setQuestions([
                  { question: "", options: ["", "", "", ""], correctIndex: 0 },
                ]);
              }
            }}
            className="gradient-accent text-accent-foreground hover:opacity-90"
          >
            <Plus size={16} className="mr-1.5" />{" "}
            {editingQuizId ? "Cancel Edit" : t("quiz.create")}
          </Button>
        </motion.div>

        {/* Course Selector */}
        <Select value={selectedCourse} onValueChange={loadQuizzes}>
          <SelectTrigger className="w-full max-w-xs bg-card">
            <SelectValue placeholder={t("quiz.selectCourse")} />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Create Quiz Form */}
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <Card className="shadow-card border-accent/20">
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label>{t("quiz.quizTitle")}</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Chapter 1 Review Quiz"
                    className="bg-muted/30"
                  />
                </div>

                {questions.map((q, qi) => (
                  <div
                    key={qi}
                    className="p-4 rounded-xl border border-border/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {t("quiz.question")} {qi + 1}
                      </span>
                      {questions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeQuestion(qi)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      )}
                    </div>
                    <Input
                      value={q.question}
                      onChange={(e) =>
                        updateQuestion(qi, "question", e.target.value)
                      }
                      placeholder={t("quiz.enterQuestion")}
                      className="bg-muted/30"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateQuestion(qi, "correctIndex", oi)
                            }
                            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              q.correctIndex === oi
                                ? "border-success bg-success text-success-foreground"
                                : "border-border"
                            }`}
                          >
                            {q.correctIndex === oi && <CheckCircle size={10} />}
                          </button>
                          <Input
                            value={opt}
                            onChange={(e) =>
                              updateOption(qi, oi, e.target.value)
                            }
                            placeholder={`${t("quiz.option")} ${oi + 1}`}
                            className="bg-muted/30 text-sm h-8"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={addQuestion}
                  className="w-full"
                >
                  <Plus size={14} className="mr-1.5" /> {t("quiz.addQuestion")}
                </Button>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => resetForm()}>
                    {t("quiz.cancel")}
                  </Button>
                  <Button
                    onClick={createQuiz}
                    className="gradient-accent text-accent-foreground hover:opacity-90"
                  >
                    {editingQuizId ? "Update Quiz" : t("quiz.create")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Existing Quizzes */}
        <div className="space-y-3">
          {quizzes.length === 0 ? (
            <Card className="shadow-card border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileQuestion
                  size={40}
                  className="text-muted-foreground/30 mb-3"
                />
                <p className="text-sm text-muted-foreground">
                  {t("quiz.empty")}
                </p>
              </CardContent>
            </Card>
          ) : (
            quizzes.map((quiz, i) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="shadow-card hover:shadow-elevated transition-all">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <FileQuestion size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground">
                        {quiz.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {quiz.questions.length} {t("quiz.questions")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditQuiz(quiz)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant={
                          quiz.isActive === false ? "default" : "secondary"
                        }
                        size="sm"
                        onClick={() =>
                          toggleQuizStatus(quiz.id, quiz.isActive === false)
                        }
                      >
                        {quiz.isActive === false ? "Activate" : "Deactivate"}
                      </Button>
                    </div>
                    <Badge
                      variant={
                        quiz.isActive === false ? "secondary" : "outline"
                      }
                      className="text-[10px]"
                    >
                      {quiz.isActive === false ? "Inactive" : "Active"}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default QuizManager;
