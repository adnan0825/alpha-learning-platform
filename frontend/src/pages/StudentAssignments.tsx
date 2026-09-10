/**
 * Student Assignments Page
 */
import React, { useEffect, useState } from "react";
import {
  assignmentsAPI,
  enrollmentsAPI,
  Assignment,
  Submission,
  Enrollment,
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

const StudentAssignments: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showSubmit, setShowSubmit] = useState<string | null>(null); // Assignment ID
  const [submissionContent, setSubmissionContent] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const myEnrollments = await enrollmentsAPI.getMyCourses();
        setEnrollments(myEnrollments);

        // Mock: fetch assignments for the first course or all
        // In a real app, we'd loop through enrollments
        if (myEnrollments.length > 0) {
          const allAssignments = await assignmentsAPI.getByCourse(
            myEnrollments[0].courseId,
          );
          setAssignments(allAssignments);
        }

        const mySubmissions = await assignmentsAPI.getStudentSubmissions(
          user.id,
        );
        setSubmissions(mySubmissions);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleSubmit = async () => {
    if (!showSubmit) return;
    try {
      const sub = await assignmentsAPI.submit(
        showSubmit,
        submissionContent + "\n" + submissionLink,
      );
      setSubmissions([...submissions, sub]);
      toast({ title: t("notify.success.assignmentSubmitted") });
      setShowSubmit(null);
      setSubmissionContent("");
      setSubmissionLink("");
    } catch (err: any) {
      toast({
        title: t("notify.error.submittingAssignment"),
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getStatus = (assignmentId: string) => {
    const sub = submissions.find((s) => s.assignmentId === assignmentId);
    if (!sub)
      return {
        label: "Pending",
        color: "text-muted-foreground bg-muted",
        icon: <Clock size={14} />,
      };
    if (sub.status === "graded")
      return {
        label: `Graded: ${sub.grade}/100`,
        color: "text-success bg-success/10",
        icon: <CheckCircle size={14} />,
      };
    return {
      label: "Submitted",
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText size={24} className="text-accent" /> My Assignments
        </h1>
        <p className="text-muted-foreground text-sm">
          Track and submit your course assignments
        </p>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filter by Course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {enrollments.map((e) => (
              <SelectItem key={e.courseId} value={e.courseId}>
                {e.courseTitle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {assignments.map((assignment, i) => {
          const status = getStatus(assignment.id);
          const isSubmitted =
            status.label.includes("Submitted") ||
            status.label.includes("Graded");

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
                        disabled
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
        {assignments.length === 0 && (
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
              <Label>Description / Notes</Label>
              <Textarea
                placeholder="Write any notes for your instructor..."
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
              />
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
            <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground text-sm hover:bg-muted/50 cursor-pointer transition-colors">
              <Upload className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Drag & drop files here or click to upload</p>
              <span className="text-xs opacity-70">
                (PDF, DOCX, ZIP up to 10MB)
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmit(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="gradient-accent text-accent-foreground"
            >
              Submit Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentAssignments;
