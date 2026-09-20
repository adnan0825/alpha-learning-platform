import { describe, expect, it } from "vitest";
import {
  normalizeBookmarkRow,
  normalizeCourseNoteRow,
  normalizeLeaderboardRow,
} from "./api";

describe("API normalization", () => {
  it("maps bookmark snake_case rows to camelCase UI fields", () => {
    const row = {
      id: 1,
      user_id: 2,
      course_id: 3,
      title: "React Basics",
      description: "Learn React",
      thumbnail: "/thumb.jpg",
      category: "web",
      difficulty: "beginner",
      instructor_name: "Ada",
      created_at: "2024-01-01T00:00:00.000Z",
    };

    expect(normalizeBookmarkRow(row)).toMatchObject({
      id: "1",
      userId: "2",
      courseId: "3",
      instructorName: "Ada",
      createdAt: "2024-01-01T00:00:00.000Z",
    });
  });

  it("maps note snake_case rows to camelCase UI fields", () => {
    const row = {
      id: 11,
      user_id: 22,
      course_id: 33,
      course_title: "Course A",
      lesson_index: 2,
      lesson_title: "Intro",
      content: "Take notes",
      created_at: "2024-02-02T00:00:00.000Z",
      updated_at: "2024-02-03T00:00:00.000Z",
    };

    expect(normalizeCourseNoteRow(row)).toMatchObject({
      id: "11",
      courseTitle: "Course A",
      lessonTitle: "Intro",
      content: "Take notes",
      lessonIndex: 2,
    });
  });

  it("maps leaderboard snake_case rows to camelCase UI fields", () => {
    const row = {
      id: 99,
      name: "Sam",
      email: "sam@example.com",
      avatar: "/avatar.png",
      courses_enrolled: 4,
      courses_completed: 3,
      lessons_completed: 40,
      certificates_earned: 2,
      average_rating: 4.5,
      reviews_given: 7,
    };

    expect(normalizeLeaderboardRow(row)).toMatchObject({
      id: "99",
      coursesEnrolled: 4,
      coursesCompleted: 3,
      lessonsCompleted: 40,
      certificatesEarned: 2,
      averageRating: 4.5,
      reviewsGiven: 7,
    });
  });
});
