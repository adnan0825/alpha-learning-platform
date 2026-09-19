/**
 * useAIContext - Hook to gather context for AI awareness
 * Collects user info, current course, progress, and page context
 * Respects course access permissions (students only see enrolled courses)
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { AIContext } from "@/lib/ai-api";
import { coursesAPI, enrollmentsAPI, CourseData, Enrollment } from "@/lib/api";

export function useAIContext(): AIContext {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [context, setContext] = useState<AIContext>({});

  useEffect(() => {
    const gatherContext = async () => {
      const newContext: AIContext = {};

      // User context
      if (profile) {
        newContext.user = {
          name: profile.displayName,
          email: profile.email,
          role: profile.role,
        };
      }

      // Current page context
      const pageName = getPageName(location.pathname);
      if (pageName) {
        newContext.currentPage = pageName;
      }

      // Get current course if on course page
      const courseMatch = location.pathname.match(/\/course\/([^/]+)/);
      if (courseMatch) {
        const courseId = courseMatch[1];
        try {
          const course = await coursesAPI.getById(courseId);
          if (course) {
            // For students, only show course details if they're enrolled
            if (profile?.role === "student") {
              // Check if student is enrolled
              const enrollments = await enrollmentsAPI.getByStudent(
                user?.id || "",
              );
              const isEnrolled = enrollments?.some(
                (e: Enrollment) => e.courseId === courseId,
              );

              if (isEnrolled) {
                // Student is enrolled - show full details
                newContext.currentCourse = {
                  id: course.id,
                  title: course.title,
                  description: course.description,
                  instructorName: course.instructorName,
                };
              } else {
                // Student NOT enrolled - only show public info
                newContext.currentCourse = {
                  id: course.id,
                  title: course.title,
                  description: "", // Hide description for non-enrolled
                  instructorName: course.instructorName,
                };
              }
            } else {
              // Instructors and admins can see all course details
              newContext.currentCourse = {
                id: course.id,
                title: course.title,
                description: course.description,
                instructorName: course.instructorName,
              };
            }
          }
        } catch (err) {
          console.error("Failed to fetch course context:", err);
        }
      }

      // Get enrolled courses for students (ONLY their enrolled courses)
      if (profile?.role === "student" && user?.id) {
        try {
          const enrollments = await enrollmentsAPI.getByStudent(user.id);
          if (enrollments && enrollments.length > 0) {
            // Fetch course details ONLY for enrolled courses
            const enrolledCourses = await Promise.all(
              enrollments.map(async (enrollment: Enrollment) => {
                try {
                  const course = await coursesAPI.getById(enrollment.courseId);
                  return {
                    id: course?.id || enrollment.courseId,
                    title: course?.title || "Unknown Course",
                    progress: enrollment.progress,
                  };
                } catch {
                  return {
                    id: enrollment.courseId,
                    title: "Unknown Course",
                    progress: enrollment.progress,
                  };
                }
              }),
            );
            newContext.enrolledCourses = enrolledCourses;
          }
        } catch (err) {
          console.error("Failed to fetch enrollments:", err);
        }
      }

      // For instructors, show courses they teach
      if (profile?.role === "instructor" && user?.id) {
        try {
          const instructorCourses = await coursesAPI.getByInstructor(user.id);
          if (instructorCourses && instructorCourses.length > 0) {
            newContext.enrolledCourses = instructorCourses.map((course) => ({
              id: course.id,
              title: course.title,
              progress: 100, // Instructors have "completed" their own courses
            }));
          }
        } catch (err) {
          console.error("Failed to fetch instructor courses:", err);
        }
      }

      // Get learning path (courses in progress)
      if (newContext.enrolledCourses) {
        const inProgress = newContext.enrolledCourses
          .filter((c) => c.progress > 0 && c.progress < 100)
          .map((c) => c.title);
        if (inProgress.length > 0) {
          newContext.learningPath = inProgress;
        }
      }

      setContext(newContext);
    };

    gatherContext();
  }, [
    location.pathname,
    user?.id,
    profile?.role,
    profile?.displayName,
    profile?.email,
  ]);

  return context;
}

/**
 * Get human-readable page name from path
 */
function getPageName(pathname: string): string {
  const pathMap: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/student/dashboard": "Student Dashboard",
    "/instructor/dashboard": "Instructor Dashboard",
    "/admin/dashboard": "Admin Dashboard",
    "/courses": "My Courses",
    "/browse": "Browse Courses",
    "/certificates": "Certificates",
    "/profile": "Profile",
    "/instructor/courses": "My Courses (Instructor)",
    "/instructor/add-course": "Add Course",
    "/admin/users": "User Management",
    "/admin/courses": "Course Management",
    "/admin/analytics": "Analytics",
    "/learning-path": "Learning Path",
    "/bookmarks": "Bookmarks",
    "/notes": "My Notes",
    "/notifications": "Notifications",
    "/leaderboard": "Leaderboard",
    "/help": "Help & Support",
    "/instructor/grades": "Student Grades",
    "/instructor/quizzes": "Quiz Manager",
    "/instructor/progress": "Student Progress",
    "/instructor/revenue": "Revenue",
    "/admin/settings": "Settings",
    "/admin/logs": "System Logs",
    "/admin/reports": "Reports",
    "/admin/moderation": "Content Moderation",
  };

  // Check exact match first
  if (pathname in pathMap) {
    return pathMap[pathname];
  }

  // Check for course view page
  if (pathname.startsWith("/course/")) {
    return "Course Details";
  }

  // Check for instructor course management
  if (pathname.startsWith("/instructor/courses/")) {
    return "Course Management";
  }

  return "";
}
