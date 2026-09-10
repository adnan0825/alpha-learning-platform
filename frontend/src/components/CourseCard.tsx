/**
 * CourseCard - Modern course card with hover effects and progress indicator.
 */
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Users, Clock, Play } from "lucide-react";
import { CourseData } from "@/lib/api";

export type { CourseData };

interface CourseCardProps {
  course: CourseData;
  progress?: number;
  onClick?: () => void;
  index?: number;
}

const difficultyColor: Record<string, string> = {
  beginner: "bg-success/10 text-success border-success/20",
  intermediate: "bg-warning/10 text-warning border-warning/20",
  advanced: "bg-destructive/10 text-destructive border-destructive/20",
};

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  progress,
  onClick,
  index = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card
        className="group cursor-pointer overflow-hidden border-border/55 bg-card/95 shadow-card backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/20 hover:shadow-elevated dark:border-border/40 dark:bg-card/80"
        onClick={onClick}
      >
        <div className="aspect-video bg-muted overflow-hidden relative">
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center gradient-hero">
              <BookOpen size={32} className="text-white/30" />
            </div>
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300 flex items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-accent/90 text-accent-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 shadow-glow-accent">
              <Play size={20} className="ml-0.5" />
            </div>
          </div>
          {/* Status badge */}
          {course.status !== "published" && (
            <Badge
              variant="secondary"
              className="absolute top-3 left-3 text-[10px] uppercase tracking-wider"
            >
              {course.status}
            </Badge>
          )}
        </div>
        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-wider font-semibold border-accent/30 text-accent"
            >
              {course.category}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] ${difficultyColor[course.difficulty] || ""}`}
            >
              {course.difficulty}
            </Badge>
          </div>
          <h3 className="font-display font-semibold text-foreground line-clamp-1 group-hover:text-accent transition-colors">
            {course.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {course.description}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
            <span className="font-medium">{course.instructorName}</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock size={11} /> {course.duration}
              </span>
              <span className="flex items-center gap-1">
                <Users size={11} /> {course.enrolledCount}
              </span>
            </div>
          </div>
          {course.price > 0 && (
            <div className="pt-2 text-center">
              <span className="text-sm font-semibold text-accent">
                {course.price} ETB
              </span>
            </div>
          )}
          {progress !== undefined && (
            <div className="pt-1.5">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold text-accent">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CourseCard;
