import { describe, expect, it, beforeEach } from "vitest";
import { clearStoredToken } from "./authStorage";

describe("authStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("keeps the current browser session isolated from shared local storage", () => {
    sessionStorage.setItem("alpha_token", "session-token");
    localStorage.setItem("alpha_token", "legacy-token");

    clearStoredToken();

    expect(sessionStorage.getItem("alpha_token")).toBeNull();
    expect(localStorage.getItem("alpha_token")).toBe("legacy-token");
  });

  it("does not clear unrelated browser-session data", () => {
    sessionStorage.setItem("alpha_token", "session-token");
    sessionStorage.setItem("other_session_data", "keep-me");
    localStorage.setItem("some_other_app_key", "still-here");

    clearStoredToken();

    expect(sessionStorage.getItem("alpha_token")).toBeNull();
    expect(sessionStorage.getItem("other_session_data")).toBe("keep-me");
    expect(localStorage.getItem("some_other_app_key")).toBe("still-here");
  });
});
