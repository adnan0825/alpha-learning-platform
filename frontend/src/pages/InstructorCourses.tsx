/**
 * Instructor Courses - Dedicated course management page.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { coursesAPI, CourseData } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import CourseCard from "@/components/CourseCard";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, PlusCircle, ArrowRight, Search, Settings, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const InstructorCourses: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;
      try { setCourses(await coursesAPI.getByInstructor(user.id)); }
      catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchCourses();
  }, [user]);

  const filtered = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">My Courses</h1>
          <p className="text-sm text-muted-foreground mt-1">{courses.length} courses total</p>
        </div>
        <Button onClick={() => navigate("/instructor/add-course")} className="gradient-accent text-accent-foreground hover:opacity-90 shadow-glow-accent">
          <PlusCircle size={18} className="mr-2" /> Add Course
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((course, i) => (
            <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="relative group">
                <CourseCard course={course} onClick={() => navigate(`/instructor/courses/${course.id}/manager`)} index={i} />
                {/* Action buttons on hover */}
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 text-xs gradient-accent text-accent-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/instructor/courses/${course.id}/manager`);
                    }}
                    title="Manage Lessons & Quizzes"
                  >
                    <Settings size={14} className="mr-1" /> Manage Course
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/course/${course.id}`);
                    }}
                    title="View as Student"
                  >
                    <PlayCircle size={14} className="mr-1" /> View
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="shadow-card border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-2xl gradient-accent flex items-center justify-center mb-4 shadow-glow-accent">
              <BookOpen size={28} className="text-accent-foreground" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">
              {search || filter !== "all" ? "No matching courses" : "No courses yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {search || filter !== "all" ? "Try adjusting your filters" : "Create your first course to get started"}
            </p>
            {!search && filter === "all" && (
              <Button onClick={() => navigate("/instructor/add-course")} className="gradient-accent text-accent-foreground hover:opacity-90 shadow-glow-accent">
                Create Course <ArrowRight size={16} className="ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InstructorCourses;
