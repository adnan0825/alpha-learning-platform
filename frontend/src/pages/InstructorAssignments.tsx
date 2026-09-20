/**
 * Instructor Assignments Grading Page
 */
import React, { useEffect, useState } from "react";
import {
  assignmentsAPI,
  Assignment,
  Submission,
  getPublicFileUrl,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { coursesAPI, CourseData } from "@/lib/api";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle,
  Clock,
  Download,
  User,
  Search,
  RefreshCw,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

const InstructorAssignments: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(
    null,
  );
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPoints, setNewPoints] = useState("100");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const myCourses = await coursesAPI.getByInstructor(user.id);
        setCourses(myCourses);
        if (myCourses.length > 0) {
          const firstId = myCourses[0].id;
          setSelectedCourse(firstId);
          await fetchSubmissions(firstId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const fetchSubmissions = async (courseId: string) => {
    setLoading(true);
    try {
      const subs = await assignmentsAPI.getSubmissionsForInstructor(courseId);
      setSubmissions(subs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId);
    fetchSubmissions(courseId);
  };

  const handleCreate = async () => {
    if (!selectedCourse) return;
    try {
      await assignmentsAPI.create(selectedCourse, {
        title: newTitle,
        description: newDescription,
        dueDate: newDueDate,
        points: Number(newPoints),
      });
      toast({ title: "Assignment created" });
      setShowCreate(false);
      setNewTitle("");
      setNewDescription("");
      setNewDueDate("");
      setNewPoints("100");
    } catch (err: any) {
      toast({
        title: "Assignment creation failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const openGrading = (sub: Submission) => {
    setGradingSubmission(sub);
    setGrade(sub.grade !== undefined ? sub.grade.toString() : "");
    setFeedback(sub.feedback || "");
  };

  const handleGradeSubmit = async () => {
    if (!gradingSubmission) return;
    try {
      await assignmentsAPI.gradeSubmission(
        gradingSubmission.id,
        parseInt(grade),
        feedback,
      );

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === gradingSubmission.id
            ? { ...s, status: "graded", grade: parseInt(grade), feedback }
            : s,
        ),
      );

      toast({ title: t("instructor.assignments.gradeSubmitted") });
      setGradingSubmission(null);
    } catch (err: any) {
      toast({
        title: t("instructor.assignments.submitError"),
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText size={24} className="text-accent" />{" "}
            {t("instructor.assignments.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("instructor.assignments.subtitle")}
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          disabled={!selectedCourse}
          className="gradient-accent text-accent-foreground"
        >
          <Plus size={16} className="mr-2" /> Create Assignment
        </Button>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedCourse} onValueChange={handleCourseChange}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue
              placeholder={t("instructor.assignments.selectCourse")}
            />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder={t("instructor.assignments.searchStudent")}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="animate-spin text-accent" />
        </div>
      ) : (
        <div className="grid gap-4">
          {submissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("instructor.assignments.empty")}
            </div>
          ) : (
            submissions.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="shadow-card hover:bg-muted/10 transition-colors">
                  <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                        {sub.studentName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">
                          {sub.studentName}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>ID: {sub.studentId}</span>
                          <span>•</span>
                          <span>
                            {new Date(sub.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1 text-foreground/80 line-clamp-1">
                          {sub.content}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                      {sub.status === "graded" ? (
                        <Badge
                          variant="outline"
                          className="text-success border-success/30 bg-success/5"
                        >
                          <CheckCircle size={12} className="mr-1" /> {sub.grade}
                          /{sub.points ?? 100}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-warning border-warning/30 bg-warning/5"
                        >
                          <Clock size={12} className="mr-1" />{" "}
                          {t("instructor.assignments.pending")}
                        </Badge>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openGrading(sub)}
                      >
                        {sub.status === "graded"
                          ? t("instructor.assignments.editGrade")
                          : t("instructor.assignments.grade")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Grading Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input
                  type="datetime-local"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Points</Label>
                <Input
                  type="number"
                  min="1"
                  value={newPoints}
                  onChange={(e) => setNewPoints(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              className="gradient-accent text-accent-foreground"
            >
              Create Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!gradingSubmission}
        onOpenChange={(open) => !open && setGradingSubmission(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("instructor.assignments.dialogTitle")}</DialogTitle>
          </DialogHeader>
          {gradingSubmission && (
            <div className="space-y-4 py-2">
              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-semibold mb-1 text-foreground">
                  {t("instructor.assignments.studentSubmission")}:
                </p>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {gradingSubmission.content}
                </p>
                {gradingSubmission.fileUrl && (
                  <a
                    className="mt-2 flex items-center gap-2 text-accent hover:underline"
                    href={getPublicFileUrl(gradingSubmission.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    download
                  >
                    <Download size={14} /> Download Attachment
                  </a>
                )}
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1 space-y-2">
                  <Label>Grade (0-{gradingSubmission.points ?? 100})</Label>
                  <Input
                    type="number"
                    min="0"
                    max={gradingSubmission.points ?? 100}
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label>Feedback</Label>
                  <Textarea
                    placeholder="Provide feedback to the student..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGradingSubmission(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGradeSubmit}
              className="gradient-accent text-accent-foreground"
            >
              Submit Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstructorAssignments;
