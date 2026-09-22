import { describe, expect, it } from "vitest";
import { getOrderedLessons, getPreviewableLessonIndexes } from "./courseIntro";

describe("courseIntro", () => {
  it("preserves free-preview flags on lesson previews", () => {
    const result = getOrderedLessons({
      introVideoUrl: "",
      introVideoTitle: "",
      videoLinks: [
        {
          title: "Lesson 1",
          url: "https://example.com/lesson-1.mp4",
          isFree: true,
        },
        {
          title: "Lesson 2",
          url: "https://example.com/lesson-2.mp4",
          isFree: false,
        },
      ],
    } as any);

    expect(result[0].isFree).toBe(true);
    expect(result[1].isFree).toBe(false);
  });

  it("exposes free lesson previews without enrollment", () => {
    const course = {
      introVideoUrl: "",
      introVideoTitle: "",
      videoLinks: [
        {
          title: "Lesson 1",
          url: "https://example.com/lesson-1.mp4",
          isFree: false,
        },
        {
          title: "Lesson 2",
          url: "https://example.com/lesson-2.mp4",
          isFree: true,
        },
        {
          title: "Lesson 3",
          url: "https://example.com/lesson-3.mp4",
          isFree: false,
        },
      ],
    } as any;

    expect(getPreviewableLessonIndexes(course)).toEqual([1]);
  });

  it("keeps module metadata attached to lessons", () => {
    const course = {
      introVideoUrl: "",
      introVideoTitle: "",
      modules: [
        { id: "mod-1", courseId: "course-1", title: "Module 1", position: 1 },
      ],
      videoLinks: [
        {
          title: "Lesson 1",
          url: "https://example.com/lesson-1.mp4",
          isFree: true,
          moduleId: "mod-1",
        },
      ],
    } as any;

    const result = getOrderedLessons(course);
    expect(result[0]).toMatchObject({
      title: "Lesson 1",
      moduleId: "mod-1",
      moduleTitle: "Module 1",
      isFree: true,
    });
  });
});
