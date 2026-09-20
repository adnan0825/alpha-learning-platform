/**
 * Student Assignments Page
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  assignmentsAPI,
  enrollmentsAPI,
  Assignment,
  Submission,
  Enrollment,
  uploadsAPI,
  getPublicFileUrl,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

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
import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle,
  Clock,
  Upload,
  Download,
  Link as LinkIcon,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

const StudentAssignments: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showSubmit, setShowSubmit] = useState<string | null>(null); // Assignment ID
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(
    null,
  );
  const [submissionContent, setSubmissionContent] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const myEnrollments = await enrollmentsAPI.getMyCourses();
        setEnrollments(myEnrollments);

        const assignmentGroups = await Promise.all(
          myEnrollments.map((enrollment) =>
            assignmentsAPI.getByCourse(enrollment.courseId),
          ),
        );
        setAssignments(assignmentGroups.flat());

        const mySubmissions = await assignmentsAPI.getStudentSubmissions(
          user.id,
        );
        setSubmissions(mySubmissions);
      } catch (err) {
        console.error(err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const visibleAssignments = useMemo(
    () =>
      selectedCourse === "all"
        ? assignments
        : assignments.filter(
            (assignment) => assignment.courseId === selectedCourse,
          ),
    [assignments, selectedCourse],
  );

  const handleSubmit = async () => {
    if (!showSubmit) return;
    setUploading(true);
    try {
      const uploadedFile = submissionFile
        ? await uploadsAPI.uploadFile(submissionFile)
        : undefined;
      const sub = await assignmentsAPI.submit(
        showSubmit,
        submissionContent,
        submissionLink,
        uploadedFile?.url,
      );
      setSubmissions([...submissions, sub]);
      toast({ title: t("assignments.submittedSuccess") });
      setShowSubmit(null);
      setSubmissionContent("");
      setSubmissionLink("");
      setSubmissionFile(null);
    } catch (err: any) {
      toast({
        title: t("assignments.submissionFailed"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatus = (assignmentId: string) => {
    const sub = submissions.find((s) => s.assignmentId === assignmentId);
    if (!sub)
      return {
        label: t("assignments.pending"),
        color: "text-muted-foreground bg-muted",
        icon: <Clock size={14} />,
      };
    if (sub.status === "graded")
      return {
        label: `${t("assignments.graded")}: ${sub.grade}/${sub.points ?? 100}`,
        color: "text-success bg-success/10",
        icon: <CheckCircle size={14} />,
      };
    return {
      label: t("assignments.submitted"),
      color: "text-info bg-info/10",
      icon: <CheckCircle size={14} />,
    };
  };

  if (loading)
    return (
      <div className="flex justify-center h-64 items-center">
        <RefreshCw className="animate-spin text-accent" />
      </div>
    );

  if (loadError) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">
          Unable to load your assignments.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          <RefreshCw size={14} className="mr-2" /> Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText size={24} className="text-accent" />{" "}
          {t("assignments.title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("assignments.subtitle")}
        </p>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder={t("assignments.filterCourse")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("assignments.allCourses")}</SelectItem>
            {enrollments.map((e) => (
              <SelectItem key={e.courseId} value={e.courseId}>
                {e.courseTitle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {visibleAssignments.map((assignment, i) => {
          const status = getStatus(assignment.id);
          const isSubmitted = submissions.some(
            (submission) => submission.assignmentId === assignment.id,
          );

          return (
            <motion.div
              key={assignment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="shadow-card hover:shadow-elevated transition-all">
                <CardContent className="p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground text-lg">
                      {assignment.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {assignment.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> Due:{" "}
                        {new Date(assignment.dueDate).toLocaleDateString()}
                      </span>
                      <span className="bg-muted px-2 py-0.5 rounded-full">
                        Points: {assignment.points}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 min-w-[140px]">
                    <Badge
                      variant="secondary"
                      className={`${status.color} px-3 py-1 flex items-center gap-1.5`}
                    >
                      {status.icon} {status.label}
                    </Badge>
                    {!isSubmitted && (
                      <Button
                        size="sm"
                        className="w-full gradient-accent text-accent-foreground"
                        onClick={() => setShowSubmit(assignment.id)}
                      >
                        <Upload size={14} className="mr-2" /> Submit
                      </Button>
                    )}
                    {isSubmitted && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          setViewingSubmission(
                            submissions.find(
                              (submission) =>
                                submission.assignmentId === assignment.id,
                            ) || null,
                          )
                        }
                      >
                        View Submission
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        {visibleAssignments.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No assignments found for this filter.
          </div>
        )}
      </div>

      {/* Submission Dialog */}
      <Dialog
        open={!!showSubmit}
        onOpenChange={(open) => !open && setShowSubmit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Attachment (PDF, ZIP, Office, or text file)</Label>
              <Input
                type="file"
                accept=".pdf,.zip,.rar,.7z,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
              />
              {submissionFile && (
                <p className="text-xs text-muted-foreground">
                  Selected: {submissionFile.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Project Link (GitHub, Google Drive, etc.)</Label>
              <div className="relative">
                <LinkIcon
                  size={16}
                  className="absolute left-3 top-3 text-muted-foreground"
                />
                <Input
                  className="pl-9"
                  placeholder="https://..."
                  value={submissionLink}
                  onChange={(e) => setSubmissionLink(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description / Notes</Label>
              <Textarea
                placeholder="Write any notes for your instructor..."
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmit(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="gradient-accent text-accent-foreground"
              disabled={
                uploading ||
                (!submissionContent.trim() &&
                  !submissionLink.trim() &&
                  !submissionFile)
              }
            >
              {uploading ? "Uploading..." : "Submit Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewingSubmission}
        onOpenChange={(open) => !open && setViewingSubmission(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>View Submission</DialogTitle>
          </DialogHeader>
          {viewingSubmission && (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-muted p-3 text-sm">
                <Label>Description / Notes</Label>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {viewingSubmission.content || "No notes provided."}
                </p>
              </div>
              {viewingSubmission.fileUrl && (
                <a
                  href={getPublicFileUrl(viewingSubmission.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="flex items-center gap-2 text-sm text-accent hover:underline"
                >
                  <Download size={15} /> Download attachment
                </a>
              )}
              {viewingSubmission.grade !== undefined ? (
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium">
                    Grade: {viewingSubmission.grade}/
                    {viewingSubmission.points ?? 100}
                  </p>
                  {viewingSubmission.feedback && (
                    <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                      Feedback: {viewingSubmission.feedback}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your submission is waiting for grading.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewingSubmission(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentAssignments;
