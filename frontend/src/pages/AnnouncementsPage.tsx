import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  announcementsAPI,
  coursesAPI,
  CourseData,
  Announcement,
} from "@/lib/api";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { Megaphone, Plus, Trash2, Clock, Users, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;
      try {
        const data = await coursesAPI.getByInstructor(user.id);
        setCourses(data);
        if (data.length > 0) {
          setSelectedCourse(data[0].id);
          await fetchAnnouncements(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load courses:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [user]);

  const fetchAnnouncements = async (courseId: string) => {
    try {
      const data = await announcementsAPI.getByCourse(courseId);
      setAnnouncements(data);
    } catch (err) {
      console.error("Failed to load announcements:", err);
    }
  };

  const handleCourseChange = async (courseId: string) => {
    setSelectedCourse(courseId);
    setRefreshing(true);
    await fetchAnnouncements(courseId);
    setRefreshing(false);
  };

  const handleCreateAnnouncement = async () => {
    if (!title.trim() || !content.trim() || !selectedCourse) return;
    try {
      const a = await announcementsAPI.create(
        selectedCourse,
        title,
        content,
        isPinned,
      );
      setAnnouncements((prev) => [a, ...prev]);
      setTitle("");
      setContent("");
      setIsPinned(false);
      setShowCreate(false);
      toast({ title: "Announcement posted!" });
    } catch (err: any) {
      toast({
        title: "Error posting announcement",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await announcementsAPI.delete(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Announcement deleted" });
    } catch (err: any) {
      toast({
        title: "Error deleting announcement",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Megaphone size={24} className="text-accent" /> Announcements
            </h1>
            <p className="text-muted-foreground text-sm">
              Post updates and reminders to your students
            </p>
          </div>
          <Button
            onClick={() => setShowCreate(!showCreate)}
            className="gradient-accent text-accent-foreground hover:opacity-90"
          >
            <Plus size={16} className="mr-1.5" /> New Post
          </Button>
        </motion.div>

        <div className="flex items-center gap-4">
          <Select value={selectedCourse} onValueChange={handleCourseChange}>
            <SelectTrigger className="w-full max-w-xs bg-card">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {refreshing && (
            <RefreshCw
              size={16}
              className="animate-spin text-muted-foreground"
            />
          )}
        </div>

        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <Card className="shadow-card border-accent/20">
              <CardContent className="p-5 space-y-4">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title..."
                  className="bg-muted/30 font-semibold"
                />
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your announcement..."
                  className="min-h-[100px] bg-muted/30"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPinned"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded border-border"
                  />
                  <label
                    htmlFor="isPinned"
                    className="text-xs text-muted-foreground"
                  >
                    Pin this announcement
                  </label>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreate(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateAnnouncement}
                    className="gradient-accent text-accent-foreground hover:opacity-90"
                  >
                    Post Announcement
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="space-y-3">
          {announcements.length === 0 ? (
            <Card className="shadow-card border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Megaphone
                  size={40}
                  className="text-muted-foreground/30 mb-3"
                />
                <p className="text-sm text-muted-foreground">
                  No announcements for this course yet
                </p>
              </CardContent>
            </Card>
          ) : (
            announcements.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="shadow-card hover:shadow-elevated transition-all group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-display font-semibold text-foreground">
                            {a.title}
                          </h4>
                          {a.isPinned && (
                            <Badge
                              variant="secondary"
                              className="text-[8px] h-4"
                            >
                              Pinned
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                          {a.content}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          <Badge
                            variant="outline"
                            className="text-[10px] border-info/30 text-info"
                          >
                            <Users size={10} className="mr-1" />{" "}
                            {a.courseId ? "Course Students" : "All Students"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock size={10} />{" "}
                            {new Date(a.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteAnnouncement(a.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
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

export default AnnouncementsPage;
