/**
 * Course View - Video player, lesson list, discussion, and quiz access.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  announcementsAPI,
  bookmarksAPI,
  coursesAPI,
  enrollmentsAPI,
  discussionsAPI,
  quizzesAPI,
  progressAPI,
  adminAPI,
  CourseData,
  Enrollment,
  Discussion,
  Quiz,
  QuizResult,
  VideoWatchProgress,
  Announcement,
} from "@/lib/api";
import {
  getOrderedLessons,
  getPreviewableLessonIndexes,
} from "@/lib/courseIntro";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

import VideoPlayer from "@/components/VideoPlayer";
import { ManualPaymentMethods } from "@/components/ManualPaymentMethods";
import { ManualPaymentReceiptUpload } from "@/components/ManualPaymentReceiptUpload";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  Play,
  MessageSquare,
  Send,
  ClipboardList,
  Trash2,
  Video,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import logo from "@/assets/logo.png";

const CourseView: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [completedVideos, setCompletedVideos] = useState<string[]>([]);
  const [watchProgress, setWatchProgress] = useState<
    Record<number, VideoWatchProgress>
  >({});
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizResults, setQuizResults] = useState<Record<string, QuizResult>>(
    {},
  );
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [deletingDiscussionId, setDeletingDiscussionId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [coursePrice, setCoursePrice] = useState(0);
  const lastWatchReportRef = useRef<Record<number, number>>({});
  const latestPlaybackRef = useRef<
    Record<number, { position: number; duration: number }>
  >({});

  // Check if current user is the instructor
  const isInstructor =
    user?.role === "instructor" && course?.instructorId === user.id;

  useEffect(() => {
    if (!courseId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const courseData = await coursesAPI.getById(courseId);
        if (courseData) {
          setCourse(courseData);
          setCoursePrice(courseData.price || 0);
        } else {
          setCourse(null);
        }

        try {
          const [discs, qz] = await Promise.all([
            discussionsAPI.getByCourse(courseId),
            quizzesAPI.getByCourse(courseId),
          ]);
          setDiscussions(discs);
          setQuizzes(qz);
        } catch (e) {
          console.error("Discussions/quizzes load failed:", e);
          setDiscussions([]);
          setQuizzes([]);
        }

        if (user) {
          try {
            const enrollments = await enrollmentsAPI.getByStudent(user.id);
            const found = enrollments.find((e) => e.courseId === courseId);
            const isCourseOwner =
              user.role === "instructor" &&
              courseData.instructorId === String(user.id);

            if (found || isCourseOwner) {
              setEnrollment(found ?? null);
              setCompletedVideos(found?.completedVideos || []);
              try {
                const [savedWatchProgress, courseAnnouncements] =
                  await Promise.all([
                    progressAPI.getCourseVideoProgress(courseId),
                    announcementsAPI.getByCourse(courseId),
                  ]);
                setWatchProgress(
                  Object.fromEntries(
                    savedWatchProgress.map((item) => [item.videoIndex, item]),
                  ),
                );
                setAnnouncements(courseAnnouncements);
              } catch (watchError) {
                console.error(
                  "Watch progress or announcements load failed:",
                  watchError,
                );
                setWatchProgress({});
                setAnnouncements([]);
              }
            } else {
              setEnrollment(null);
              setCompletedVideos([]);
              setWatchProgress({});
              setAnnouncements([]);
            }
          } catch (e) {
            console.error("Enrollments load failed:", e);
            setEnrollment(null);
            setCompletedVideos([]);
            setWatchProgress({});
            setAnnouncements([]);
          }
        } else {
          setEnrollment(null);
          setCompletedVideos([]);
          setWatchProgress({});
          setAnnouncements([]);
        }
      } catch (err) {
        console.error("Error:", err);
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, user]);

  const { lessons, activeIdx, fullLessonAccess } = useMemo(() => {
    if (!course) {
      return {
        lessons: [] as {
          title: string;
          url: string;
          duration?: string;
          isFree?: boolean;
        }[],
        activeIdx: 0,
        fullLessonAccess: false,
      };
    }
    const ordered = getOrderedLessons(course);
    const isInstr =
      user?.role === "instructor" && course.instructorId === user.id;
    const full = Boolean(enrollment || isInstr);
    const previewable = getPreviewableLessonIndexes(course);
    const maxI = Math.max(0, ordered.length - 1);
    const fallbackIdx = previewable.length > 0 ? previewable[0] : 0;
    const desiredIdx = full
      ? Math.min(Math.max(0, currentVideoIndex), maxI)
      : previewable.includes(currentVideoIndex)
        ? currentVideoIndex
        : fallbackIdx;

    return {
      lessons: ordered,
      activeIdx: Math.min(Math.max(0, desiredIdx), maxI),
      fullLessonAccess: full,
    };
  }, [course, enrollment, currentVideoIndex, user?.role, user?.id]);

  useEffect(() => {
    if (!user || !courseId) {
      setIsBookmarked(false);
      return;
    }

    let isMounted = true;
    bookmarksAPI
      .check(courseId)
      .then(({ isBookmarked: bookmarked }) => {
        if (isMounted) setIsBookmarked(Boolean(bookmarked));
      })
      .catch(() => {
        if (isMounted) setIsBookmarked(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, courseId]);

  useEffect(() => {
    if (!user || !fullLessonAccess || quizzes.length === 0) {
      setQuizResults({});
      return;
    }
    Promise.all(
      quizzes.map(
        async (quiz) =>
          [quiz.id, await quizzesAPI.getResults(quiz.id, user.id)] as const,
      ),
    )
      .then((results) =>
        setQuizResults(
          Object.fromEntries(
            results.filter((entry): entry is [string, QuizResult] =>
              Boolean(entry[1]),
            ),
          ),
        ),
      )
      .catch((error) => console.error("Quiz results load failed:", error));
  }, [fullLessonAccess, quizzes, user]);

  useEffect(() => {
    if (!enrollment || !course || lessons.length === 0) return;

    const flushCurrentVideo = () => {
      const current = latestPlaybackRef.current[activeIdx];
      if (
        !current ||
        !Number.isFinite(current.position) ||
        !Number.isFinite(current.duration)
      ) {
        return;
      }
      void reportVideoProgress(
        activeIdx,
        current.position,
        current.duration,
        false,
        false,
        true,
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushCurrentVideo();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", flushCurrentVideo);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", flushCurrentVideo);
    };
  }, [activeIdx, course, enrollment, lessons.length]);

  const toggleBookmark = async () => {
    if (!user || !courseId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save this course.",
        variant: "destructive",
      });
      return;
    }

    setBookmarking(true);
    try {
      if (isBookmarked) {
        await bookmarksAPI.remove(courseId);
        setIsBookmarked(false);
        toast({
          title: "Bookmark removed",
          description: "This course was removed from your saved list.",
        });
      } else {
        await bookmarksAPI.add(courseId);
        setIsBookmarked(true);
        toast({
          title: "Course saved",
          description: "This course has been added to your bookmarks.",
        });
      }
    } catch (error) {
      console.error("Bookmark toggle failed:", error);
      toast({
        title: "Could not update bookmark",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBookmarking(false);
    }
  };

  const toggleComplete = async (videoIndex: number) => {
    if (!enrollment || !course || lessons.length === 0) return;
    const lesson = lessons[videoIndex];
    if (lesson?.url?.trim() && !watchProgress[videoIndex]?.completed) {
      toast({
        title: "Watch the lesson video first",
        description:
          "The completion action unlocks after the video reaches the end.",
        variant: "destructive",
      });
      return;
    }
    const videoKey = `video_${videoIndex}`;
    const updated = completedVideos.includes(videoKey)
      ? completedVideos.filter((v) => v !== videoKey)
      : [...completedVideos, videoKey];
    setCompletedVideos(updated);
    try {
      const saved = await enrollmentsAPI.updateProgress(enrollment.id, updated);
      setEnrollment(saved);
    } catch (error) {
      setCompletedVideos(completedVideos);
      toast({
        title: t("course.progressSaveFailed"),
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const reportVideoProgress = async (
    videoIndex: number,
    positionSeconds: number,
    durationSeconds: number,
    playing: boolean,
    ended = false,
    force = false,
  ) => {
    if (
      !enrollment ||
      !course ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0
    )
      return;
    latestPlaybackRef.current[videoIndex] = {
      position: positionSeconds,
      duration: durationSeconds,
    };
    const now = Date.now();
    const lastReport = lastWatchReportRef.current[videoIndex] || 0;
    if (!ended && !force && now - lastReport < 4000) return;
    lastWatchReportRef.current[videoIndex] = now;
    try {
      const saved = await progressAPI.recordCourseVideoProgress(
        course.id,
        videoIndex,
        { positionSeconds, durationSeconds, playing, ended },
      );
      setWatchProgress((previous) => ({
        ...previous,
        [videoIndex]: saved,
      }));
      if (saved.enrollment) {
        setEnrollment(saved.enrollment);
        setCompletedVideos(saved.enrollment.completedVideos || []);
      }
    } catch (error) {
      console.error("Video progress save failed:", error);
    }
  };

  const postComment = async () => {
    if (!user || !courseId || !newComment.trim()) return;
    const disc = await discussionsAPI.post({
      courseId,
      lessonIndex: activeIdx,
      userId: user.id,
      userName: user.displayName,
      userRole: user.role,
      content: newComment.trim(),
    });
    setDiscussions((prev) => [...prev, { ...disc, replies: [] }]);
    setNewComment("");
  };

  const postReply = async (parentId: string, content: string) => {
    if (!user || !courseId) return;
    const reply = await discussionsAPI.post({
      courseId,
      lessonIndex: activeIdx,
      userId: user.id,
      userName: user.displayName,
      userRole: user.role,
      content,
      parentId,
    });
    setDiscussions((prev) =>
      prev.map((d) =>
        d.id === parentId
          ? { ...d, replies: [...(d.replies || []), reply] }
          : d,
      ),
    );
  };

  const isAdmin = user?.role === "admin";

  const deleteDiscussionPost = async (id: string) => {
    if (!isAdmin) return;
    if (
      !window.confirm(
        "Delete this discussion post? If it is the main comment, all replies under it will be removed as well.",
      )
    ) {
      return;
    }
    setDeletingDiscussionId(id);
    try {
      await adminAPI.deleteDiscussion(id);
      setDiscussions((prev) =>
        prev
          .filter((d) => d.id !== id)
          .map((d) => ({
            ...d,
            replies: (d.replies || []).filter((r) => r.id !== id),
          })),
      );
      toast({
        title: t("common.removed"),
        description: t("common.discussionDeleted"),
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not delete this post.";
      toast({
        title: t("course.deleteDiscussionFailed"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeletingDiscussionId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CoursePublicHeader courseId={courseId} />
        <div className="flex h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-accent" />
        </div>
      </div>
    );
  }
  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <CoursePublicHeader courseId={courseId} />
        <div className="text-center py-20 px-4">
          <p className="text-muted-foreground">{t("course.notFound")}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/")}
          >
            Home
          </Button>
        </div>
      </div>
    );
  }

  const activeLesson = lessons[activeIdx];
  const progress = lessons.length
    ? Math.round((completedVideos.length / lessons.length) * 100)
    : 0;
  const lessonDiscussions = discussions.filter(
    (d) => d.lessonIndex === activeIdx && !d.parentId,
  );

  return (
    <div className="min-h-screen bg-background">
      <CoursePublicHeader courseId={courseId} />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 animate-fade-in lg:px-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {!fullLessonAccess && lessons.length > 1 ? (
              <p className="text-xs font-medium text-muted-foreground">
                Preview: intro lesson — sign in and enroll to unlock all{" "}
                {lessons.length} lessons.
              </p>
            ) : null}
            {lessons.length > 0 && activeLesson ? (
              <VideoPlayer
                url={activeLesson.url}
                title={activeLesson.title}
                initialTime={watchProgress[activeIdx]?.lastPositionSeconds || 0}
                onProgress={(position, duration, playing, force) =>
                  reportVideoProgress(
                    activeIdx,
                    position,
                    duration,
                    playing,
                    false,
                    force,
                  )
                }
                onEnded={() => {
                  const latest = latestPlaybackRef.current[activeIdx];
                  void reportVideoProgress(
                    activeIdx,
                    latest?.position || 0,
                    latest?.duration || 0,
                    false,
                    true,
                  );
                }}
              />
            ) : (
              <div className="aspect-video rounded-xl bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">{t("course.noVideos")}</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-3">
                <h1 className="font-display text-xl font-bold text-foreground">
                  {course.title}
                </h1>
                <div className="flex items-center gap-2">
                  {user && user.role === "student" && (
                    <Button
                      variant={isBookmarked ? "secondary" : "outline"}
                      size="sm"
                      onClick={toggleBookmark}
                      disabled={bookmarking}
                      className="gap-2"
                    >
                      {isBookmarked ? (
                        <BookmarkCheck size={16} />
                      ) : (
                        <Bookmark size={16} />
                      )}
                      {bookmarking
                        ? "Saving..."
                        : isBookmarked
                          ? "Saved"
                          : "Save course"}
                    </Button>
                  )}
                  {isInstructor && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(`/instructor/courses/${courseId}/edit`)
                      }
                      className="gap-1"
                    >
                      Edit Course
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                By {course.instructorName} • {activeLesson?.title}
              </p>
              <p className="text-sm text-muted-foreground mt-3">
                {course.description}
              </p>
            </div>

            {announcements.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="font-display text-base font-semibold text-foreground">
                  Course announcements
                </h3>
                {announcements.map((announcement) => (
                  <Card
                    key={announcement.id}
                    className="border-accent/20 bg-accent/5"
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                            {announcement.isPinned ? "Pinned" : "Update"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {announcement.instructorName}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(
                            announcement.createdAt,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-semibold text-foreground">
                        {announcement.title}
                      </h4>
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Tabs: Lessons, Discussion & Quizzes */}
            <Tabs defaultValue="lessons" className="mt-6">
              <TabsList>
                <TabsTrigger value="lessons" className="gap-1">
                  <Video size={14} /> Lessons
                </TabsTrigger>
                <TabsTrigger value="discussion" className="gap-1">
                  <MessageSquare size={14} /> Discussion
                </TabsTrigger>
                <TabsTrigger value="quizzes" className="gap-1">
                  <ClipboardList size={14} /> Quizzes ({quizzes.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="lessons" className="mt-4">
                <div className="space-y-2">
                  {lessons.map((lesson, index) => {
                    const isPreviewable =
                      fullLessonAccess ||
                      Boolean(lesson.isFree) ||
                      (course?.introVideoUrl?.trim() &&
                        lesson.url === course.introVideoUrl.trim());

                    const handleLessonSelect = () => {
                      if (!isPreviewable) return;
                      setCurrentVideoIndex(index);
                    };

                    return (
                      <Card
                        key={index}
                        onClick={handleLessonSelect}
                        onKeyDown={(event) => {
                          if (
                            (event.key === "Enter" || event.key === " ") &&
                            isPreviewable
                          ) {
                            event.preventDefault();
                            handleLessonSelect();
                          }
                        }}
                        role="button"
                        tabIndex={isPreviewable ? 0 : -1}
                        aria-label={`Open lesson ${index + 1}: ${lesson.title}`}
                        className={`p-3 flex items-center gap-3 transition-colors ${
                          !isPreviewable
                            ? "opacity-60 cursor-default"
                            : "cursor-pointer hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/60"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">
                            {lesson.title}
                          </h4>
                          {lesson.duration && (
                            <p className="text-xs text-muted-foreground">
                              {lesson.duration}
                            </p>
                          )}
                        </div>
                        {!isPreviewable && (
                          <Badge variant="outline" className="text-xs">
                            Locked
                          </Badge>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="discussion" className="mt-4 space-y-4">
                {!fullLessonAccess ? (
                  <p className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    {user ? (
                      <>
                        Use{" "}
                        <span className="font-medium text-foreground">
                          Enroll
                        </span>{" "}
                        in the sidebar to join the discussion.
                      </>
                    ) : (
                      <>
                        <Link
                          to={`/login?redirect=${encodeURIComponent(`/course/${courseId}`)}`}
                          className="font-medium text-accent underline-offset-4 hover:underline"
                        >
                          Sign in and enroll
                        </Link>{" "}
                        to join the discussion.
                      </>
                    )}
                  </p>
                ) : user ? (
                  <div className="flex gap-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={t("course.askDiscussion")}
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      onClick={postComment}
                      size="icon"
                      className="self-end gradient-accent text-accent-foreground"
                    >
                      <Send size={16} />
                    </Button>
                  </div>
                ) : (
                  <p className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    <Link
                      to={`/login?redirect=${encodeURIComponent(`/course/${courseId}`)}`}
                      className="font-medium text-accent underline-offset-4 hover:underline"
                    >
                      Sign in
                    </Link>{" "}
                    to join the discussion.
                  </p>
                )}
                {lessonDiscussions.length > 0 ? (
                  <div className="space-y-4">
                    {lessonDiscussions.map((d) => (
                      <DiscussionThread
                        key={d.id}
                        discussion={d}
                        onReply={postReply}
                        canReply={Boolean(user)}
                        isAdmin={isAdmin}
                        onDeletePost={deleteDiscussionPost}
                        deletingId={deletingDiscussionId}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No comments yet. Be the first to start a discussion!
                  </p>
                )}
              </TabsContent>

              <TabsContent value="quizzes" className="mt-4">
                {quizzes.length > 0 ? (
                  <div className="space-y-3">
                    {quizzes.map((quiz) => (
                      <Card
                        key={quiz.id}
                        className={`shadow-card transition-shadow ${fullLessonAccess ? "cursor-pointer hover:shadow-lg" : "opacity-60 pointer-events-none"}`}
                        onClick={() => {
                          if (!fullLessonAccess) return;
                          navigate(`/course/${courseId}/quiz/${quiz.id}`);
                        }}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-foreground">
                              {quiz.title}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {quiz.questions.length} questions
                            </p>
                          </div>
                          {!fullLessonAccess && (
                            <Badge variant="outline" className="text-xs">
                              Locked
                            </Badge>
                          )}
                          {fullLessonAccess && (
                            <Button variant="outline" size="sm">
                              {quizResults[quiz.id]
                                ? `Completed: ${quizResults[quiz.id].score}/${quizResults[quiz.id].total}`
                                : "Take Quiz"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No quizzes for this course yet.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {!isInstructor && !enrollment && coursePrice && coursePrice > 0 ? (
              <div className="space-y-4">
                <ManualPaymentMethods
                  courseTitle={course.title}
                  amountEtb={coursePrice}
                />
                <ManualPaymentReceiptUpload
                  courseId={course.id}
                  courseTitle={course.title}
                  amountEtb={coursePrice}
                />
              </div>
            ) : !isInstructor && !enrollment ? (
              <Card className="shadow-card">
                <CardContent className="p-4 text-center space-y-3">
                  <h3 className="font-semibold">{t("course.freeCourse")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {user
                      ? "Enroll now to unlock all lessons and track progress."
                      : "Sign in to enroll and access the full course."}
                  </p>
                  {user ? (
                    <Button
                      onClick={async () => {
                        try {
                          await enrollmentsAPI.enroll(courseId!);
                          window.location.reload();
                        } catch (err) {
                          console.error("Enrollment error:", err);
                        }
                      }}
                      className="w-full gradient-accent text-accent-foreground"
                    >
                      Enroll Now
                    </Button>
                  ) : (
                    <Button
                      className="w-full gradient-accent text-accent-foreground"
                      asChild
                    >
                      <Link
                        to={`/login?redirect=${encodeURIComponent(`/course/${courseId}`)}`}
                      >
                        Sign in to enroll
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">
                        Your Progress
                      </span>
                      <span className="text-sm font-bold text-accent">
                        {progress}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {completedVideos.length} of {lessons.length} lessons
                      completed
                    </p>
                    {progress === 100 && (
                      <Button
                        size="sm"
                        className="w-full mt-3 gradient-accent text-accent-foreground"
                        onClick={() => navigate(`/certificates`)}
                      >
                        View Certificate 🎉
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardContent className="p-4 space-y-1">
                    <h3 className="font-display font-semibold text-foreground mb-3">
                      Lessons
                    </h3>
                    {lessons.map((lesson, index) => {
                      const isCompleted = completedVideos.includes(
                        `video_${index}`,
                      );
                      const requiresVideo = Boolean(lesson.url?.trim());
                      const videoWatched = Boolean(
                        watchProgress[index]?.completed,
                      );
                      const isCurrent = index === currentVideoIndex;
                      return (
                        <div
                          key={index}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${isCurrent ? "bg-accent/10" : "hover:bg-muted"}`}
                          onClick={() =>
                            fullLessonAccess && setCurrentVideoIndex(index)
                          }
                        >
                          {isCurrent ? (
                            <Play
                              size={16}
                              className="text-accent flex-shrink-0"
                            />
                          ) : isCompleted ? (
                            <CheckCircle
                              size={16}
                              className="text-success flex-shrink-0"
                            />
                          ) : (
                            <Circle
                              size={16}
                              className="text-muted-foreground flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <span
                              className={`text-sm block truncate ${isCurrent ? "font-medium text-foreground" : "text-muted-foreground"}`}
                            >
                              {lesson.title}
                            </span>
                            {lesson.duration && (
                              <span className="text-[10px] text-muted-foreground">
                                {lesson.duration}
                              </span>
                            )}
                          </div>
                          <button
                            disabled={requiresVideo && !videoWatched}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleComplete(index);
                            }}
                            title={
                              requiresVideo && !videoWatched
                                ? "Watch the video to the end to unlock completion"
                                : undefined
                            }
                            className="text-xs text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 flex-shrink-0"
                          >
                            {isCompleted ? "Undo" : "Done"}
                          </button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function CoursePublicHeader({ courseId }: { courseId?: string }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const redirectPath = courseId ? `/course/${courseId}` : "/";

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-[3.75rem] max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <img
            src={logo}
            alt=""
            className="h-9 w-9 rounded-lg object-cover ring-1 ring-border/40"
          />
          <span className="font-display hidden font-semibold text-foreground sm:inline">
            Alpha
          </span>
        </Link>
        {user ? (
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">{t("common.dashboard")}</Link>
          </Button>
        ) : (
          <Button
            size="sm"
            className="gradient-accent text-accent-foreground"
            asChild
          >
            <Link to={`/login?redirect=${encodeURIComponent(redirectPath)}`}>
              Sign in
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}

/** Discussion thread with reply support */
const DiscussionThread: React.FC<{
  discussion: Discussion;
  onReply: (parentId: string, content: string) => void;
  canReply?: boolean;
  isAdmin?: boolean;
  onDeletePost?: (id: string) => void;
  deletingId?: string | null;
}> = ({
  discussion,
  onReply,
  canReply = true,
  isAdmin = false,
  onDeletePost,
  deletingId = null,
}) => {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(discussion.id, replyText.trim());
    setReplyText("");
    setShowReply(false);
  };

  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full gradient-accent flex items-center justify-center text-accent-foreground text-xs font-bold flex-shrink-0">
            {discussion.userName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {discussion.userName}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {discussion.userRole}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(discussion.createdAt).toLocaleDateString()}
                </span>
              </div>
              {isAdmin && onDeletePost ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                  disabled={deletingId === discussion.id}
                  onClick={() => onDeletePost(discussion.id)}
                  title="Delete this post (admin)"
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {discussion.content}
            </p>
            {canReply ? (
              <button
                type="button"
                onClick={() => setShowReply(!showReply)}
                className="text-xs text-accent hover:underline mt-2"
              >
                Reply
              </button>
            ) : null}

            {canReply && showReply && (
              <div className="flex gap-2 mt-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t("course.writeReply")}
                  rows={1}
                  className="flex-1 text-xs"
                />
                <Button onClick={handleReply} size="sm" variant="outline">
                  Send
                </Button>
              </div>
            )}

            {discussion.replies && discussion.replies.length > 0 && (
              <div className="mt-3 space-y-3 pl-4 border-l-2 border-border">
                {discussion.replies.map((r) => (
                  <div key={r.id} className="flex items-start gap-2">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {r.userName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-xs font-medium text-foreground">
                            {r.userName}
                          </span>
                          <Badge variant="secondary" className="text-[8px] h-4">
                            {r.userRole}
                          </Badge>
                        </div>
                        {isAdmin && onDeletePost ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 shrink-0 gap-1 px-1.5 text-[10px] text-destructive hover:text-destructive"
                            disabled={deletingId === r.id}
                            onClick={() => onDeletePost(r.id)}
                            title="Delete reply (admin)"
                          >
                            <Trash2 size={12} />
                          </Button>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseView;
