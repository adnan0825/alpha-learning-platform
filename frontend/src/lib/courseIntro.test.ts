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
});
