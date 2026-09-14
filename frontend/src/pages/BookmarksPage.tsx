/**
 * Student Bookmarks / Saved Courses
 * Uses real backend bookmarks API
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bookmarksAPI, CourseData, Bookmark as BookmarkType } from "@/lib/api";

import CourseCard from "@/components/CourseCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Bookmark, BookOpen, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const BookmarksPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const data = await bookmarksAPI.getMyBookmarks();
      setBookmarks(data);
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async (courseId: string) => {
    setDeleting(courseId);
    try {
      await bookmarksAPI.remove(courseId);
      setBookmarks((prev) => prev.filter((b) => b.courseId !== courseId));
    } catch (err) {
      console.error("Failed to remove bookmark:", err);
    } finally {
      setDeleting(null);
    }
  };

  const courseToCardData = (bookmark: BookmarkType): CourseData => ({
    id: bookmark.courseId,
    title: bookmark.title,
    description: bookmark.description,
    category: bookmark.category,
    thumbnail: bookmark.thumbnail,
    videoLinks: [],
    totalVideos: 0,
    instructorId: "",
    instructorName: bookmark.instructorName,
    enrolledCount: 0,
    status: "published",
    difficulty: bookmark.difficulty as any,
    duration: "",
    price: 0,
    createdAt: bookmark.createdAt,
  });

  return (
    <>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Bookmark size={24} className="text-accent" />{" "}
            {t("bookmarks.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("bookmarks.subtitle")}
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-72 rounded-2xl bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : bookmarks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookmarks.map((bookmark, i) => (
              <motion.div
                key={bookmark.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <CourseCard
                  course={courseToCardData(bookmark)}
                  onClick={() => navigate(`/course/${bookmark.courseId}`)}
                  index={i}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 z-10 h-8 w-8 bg-card/80 backdrop-blur-sm text-accent hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveBookmark(bookmark.courseId);
                  }}
                  disabled={deleting === bookmark.courseId}
                >
                  {deleting === bookmark.courseId ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Bookmark size={14} className="fill-current" />
                  )}
                </Button>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="shadow-card border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-4">
                <Bookmark size={28} />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                {t("bookmarks.emptyTitle")}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {t("bookmarks.emptyDescription")}
              </p>
              <Button
                onClick={() => navigate("/browse")}
                className="gradient-accent text-accent-foreground hover:opacity-90"
              >
                {t("bookmarks.browse")}{" "}
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default BookmarksPage;
