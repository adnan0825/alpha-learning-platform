import type { LeaderboardEntry } from "./api";

export type LeaderboardAchievement = {
  title: string;
  description: string;
  unlocked: boolean;
  color: string;
};

export function calculateLeaderboardPoints(
  student: Pick<
    LeaderboardEntry,
    | "coursesCompleted"
    | "lessonsCompleted"
    | "certificatesEarned"
    | "reviewsGiven"
    | "averageRating"
  >,
): number {
  const courses = Number(student.coursesCompleted ?? 0);
  const lessons = Number(student.lessonsCompleted ?? 0);
  const certificates = Number(student.certificatesEarned ?? 0);
  const reviews = Number(student.reviewsGiven ?? 0);
  const rating = Number(student.averageRating ?? 0);

  return (
    courses * 120 +
    lessons * 8 +
    certificates * 200 +
    reviews * 25 +
    Math.round(rating * 20)
  );
}

export function getLeaderboardAchievements(
  student: Pick<
    LeaderboardEntry,
    | "coursesEnrolled"
    | "coursesCompleted"
    | "lessonsCompleted"
    | "certificatesEarned"
    | "reviewsGiven"
  >,
  rank: number,
): LeaderboardAchievement[] {
  const coursesEnrolled = Number(student.coursesEnrolled ?? 0);

  return [
    {
      title: "First Course",
      description: "Enroll in your first course",
      unlocked: coursesEnrolled >= 1,
      color: "text-info",
    },
    {
      title: "Course Collector",
      description: "Complete 3 courses",
      unlocked: student.coursesCompleted >= 3,
      color: "text-success",
    },
    {
      title: "Lesson Hunter",
      description: "Complete 20 lessons",
      unlocked: student.lessonsCompleted >= 20,
      color: "text-warning",
    },
    {
      title: "Certificate Earner",
      description: "Earn at least one certificate",
      unlocked: student.certificatesEarned >= 1,
      color: "text-accent",
    },
    {
      title: "Top 10",
      description: "Reach the top 10 leaderboard rank",
      unlocked: rank <= 10,
      color: "text-destructive",
    },
    {
      title: "Reviewer",
      description: "Leave at least one course review",
      unlocked: student.reviewsGiven >= 1,
      color: "text-primary",
    },
  ];
}
