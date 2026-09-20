import { describe, expect, it } from "vitest";
import { formatFeedbackSender, type UserFeedbackItem } from "./api";

describe("formatFeedbackSender", () => {
  it("shows the registered sender name and role", () => {
    const item: UserFeedbackItem = {
      id: "1",
      userId: "42",
      userName: "Aisha Khan",
      userRole: "instructor",
      userEmail: "aisha@example.com",
      subject: "Need help",
      message: "I need support",
      adminReply: null,
      repliedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    expect(formatFeedbackSender(item)).toEqual({
      label: "Aisha Khan",
      roleLabel: "Instructor",
      isGuest: false,
    });
  });

  it("falls back to guest when the sender is not registered", () => {
    const item: UserFeedbackItem = {
      id: "2",
      userId: null,
      userName: "Guest visitor",
      userRole: null,
      userEmail: null,
      subject: "Need help",
      message: "I need support",
      adminReply: null,
      repliedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    expect(formatFeedbackSender(item)).toEqual({
      label: "Guest visitor",
      roleLabel: "Guest",
      isGuest: true,
    });
  });
});
