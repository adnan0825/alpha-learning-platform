import type { CourseData } from "@/lib/api";

/** Public free intro: dedicated intro URL, else first lesson in `videoLinks`. */
export function getPublicIntroVideo(
  course: Pick<CourseData, "introVideoUrl" | "introVideoTitle" | "videoLinks">
): { url: string; title: string } | null {
  const intro = course.introVideoUrl?.trim();
  if (intro) {
    return {
      url: intro,
      title: course.introVideoTitle?.trim() || "Introduction",
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

/** Ordered lessons for the player + sidebar: optional dedicated intro, then curriculum `videoLinks`. */
export function getOrderedLessons(
  course: Pick<CourseData, "introVideoUrl" | "introVideoTitle" | "videoLinks">
): { title: string; url: string; duration?: string }[] {
  const intro = course.introVideoUrl?.trim();
  if (intro) {
    return [
      {
        title: course.introVideoTitle?.trim() || "Introduction",
        url: intro,
        duration: "",
      },
      ...course.videoLinks,
    ];
  }
  return [...course.videoLinks];
}
