import { describe, expect, it } from "vitest";
import {
  calculateLeaderboardPoints,
  getLeaderboardAchievements,
} from "./leaderboard";

describe("leaderboard scoring and achievements", () => {
  it("calculates points from real learner metrics", () => {
    expect(
      calculateLeaderboardPoints({
        coursesCompleted: 3,
        lessonsCompleted: 20,
        certificatesEarned: 2,
        reviewsGiven: 1,
        averageRating: 4.5,
      }),
    ).toBe(3 * 120 + 20 * 8 + 2 * 200 + 1 * 25 + Math.round(4.5 * 20));
  });

  it("marks achievements based on real data", () => {
    const badges = getLeaderboardAchievements(
      {
        coursesCompleted: 3,
        lessonsCompleted: 20,
        certificatesEarned: 1,
        reviewsGiven: 1,
      },
      8,
    );

    expect(badges.find((b) => b.title === "Course Collector")?.unlocked).toBe(
      true,
    );
    expect(badges.find((b) => b.title === "Top 10")?.unlocked).toBe(true);
    expect(badges.find((b) => b.title === "Certificate Earner")?.unlocked).toBe(
      true,
    );
    expect(badges.find((b) => b.title === "Reviewer")?.unlocked).toBe(true);
  });

  it("unlocks First Course from enrollment, not course completion", () => {
    const badges = getLeaderboardAchievements(
      {
        coursesEnrolled: 1,
        coursesCompleted: 0,
        lessonsCompleted: 0,
        certificatesEarned: 0,
        reviewsGiven: 0,
      },
      50,
    );

    expect(badges.find((b) => b.title === "First Course")?.unlocked).toBe(true);
  });
});
