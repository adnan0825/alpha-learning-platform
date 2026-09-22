import { describe, expect, it, beforeEach } from "vitest";
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "./authStorage";

describe("authStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("reads a shared token from localStorage so a new tab stays signed in", () => {
    localStorage.setItem("alpha_token", "shared-token");

    expect(getStoredToken()).toBe("shared-token");
  });

  it("writes auth state to shared storage and clears both scopes on logout", () => {
    setStoredToken("shared-token");
    sessionStorage.setItem("alpha_token", "stale-session-token");

    expect(getStoredToken()).toBe("shared-token");

    clearStoredToken();

    expect(getStoredToken()).toBeNull();
    expect(sessionStorage.getItem("alpha_token")).toBeNull();
    expect(localStorage.getItem("alpha_token")).toBeNull();
  });

  it("does not clear unrelated browser state", () => {
    sessionStorage.setItem("alpha_token", "session-token");
    sessionStorage.setItem("other_session_data", "keep-me");
    localStorage.setItem("some_other_app_key", "still-here");

    clearStoredToken();

    expect(sessionStorage.getItem("alpha_token")).toBeNull();
    expect(sessionStorage.getItem("other_session_data")).toBe("keep-me");
    expect(localStorage.getItem("some_other_app_key")).toBe("still-here");
  });
});
