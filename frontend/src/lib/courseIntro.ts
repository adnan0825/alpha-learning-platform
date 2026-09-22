import type { CourseData } from "@/lib/api";

/** Returns all lesson indexes currently visible to non-enrolled users. */
export function getPreviewableLessonIndexes(
  course: Pick<CourseData, "introVideoUrl" | "introVideoTitle" | "videoLinks">,
): number[] {
  const indexes = new Set<number>();
  const intro = course.introVideoUrl?.trim();

  if (intro) {
    indexes.add(0);
  }

  course.videoLinks?.forEach((lesson, index) => {
    const actualIndex = intro ? index + 1 : index;
    if (lesson.isFree) {
      indexes.add(actualIndex);
    }
  });

  return [...indexes].sort((a, b) => a - b);
}

/** Public free intro: dedicated intro URL, else first free lesson or first lesson in `videoLinks`. */
export function getPublicIntroVideo(
  course: Pick<CourseData, "introVideoUrl" | "introVideoTitle" | "videoLinks">,
): { url: string; title: string } | null {
  const intro = course.introVideoUrl?.trim();
  if (intro) {
    return {
      url: intro,
      title: course.introVideoTitle?.trim() || "Introduction",
    };
  }

  const freeLesson = course.videoLinks?.find(
    (lesson) => lesson.isFree && lesson.url?.trim(),
  );
  if (freeLesson?.url?.trim()) {
    return {
      url: freeLesson.url.trim(),
      title: freeLesson.title?.trim() || "Free preview",
    };
  }

  const first = course.videoLinks?.[0];
  if (first?.url?.trim()) {
    return {
      url: first.url.trim(),
      title: first.title?.trim() || "Introduction",
    };
  }
  return null;
}

/** Ordered lessons for the player + sidebar: optional dedicated intro, then curriculum `videoLinks` with free-preview metadata. */
export function getOrderedLessons(
  course: Pick<
    CourseData,
    "introVideoUrl" | "introVideoTitle" | "videoLinks" | "modules"
  >,
): Array<{
  title: string;
  url: string;
  duration?: string;
  isFree?: boolean;
  moduleId?: string | null;
  moduleTitle?: string;
}> {
  const intro = course.introVideoUrl?.trim();
  const moduleLookup = new Map(
    (course.modules ?? []).map((module) => [
      String(module.id),
      module.title || "",
    ]),
  );

  const lessons = (course.videoLinks ?? []).map((lesson, index) => ({
    title: lesson.title?.trim() || `Lesson ${index + 1}`,
    url: lesson.url?.trim() || "",
    duration: lesson.duration,
    isFree: Boolean(lesson.isFree),
    moduleId: lesson.moduleId ?? null,
    moduleTitle:
      lesson.moduleTitle?.trim() ||
      (lesson.moduleId ? moduleLookup.get(String(lesson.moduleId)) || "" : ""),
  }));

  if (intro) {
    return [
      {
        title: course.introVideoTitle?.trim() || "Introduction",
        url: intro,
        duration: "",
        isFree: true,
        moduleId: null,
        moduleTitle: "",
      },
      ...lessons,
    ];
  }

  return lessons;
}
