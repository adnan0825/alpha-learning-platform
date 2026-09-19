import { describe, expect, it, beforeEach } from "vitest";
import { clearStoredToken } from "./authStorage";

describe("authStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("clears legacy browser tokens", () => {
    sessionStorage.setItem("alpha_token", "session-token");
    localStorage.setItem("alpha_token", "legacy-token");

    clearStoredToken();
    expect(sessionStorage.getItem("alpha_token")).toBeNull();
    expect(localStorage.getItem("alpha_token")).toBeNull();
  });

  it("clears the token from both stores", () => {
    sessionStorage.setItem("alpha_token", "session-token");
    localStorage.setItem("alpha_token", "legacy-token");

    clearStoredToken();

    expect(sessionStorage.getItem("alpha_token")).toBeNull();
    expect(localStorage.getItem("alpha_token")).toBeNull();
  });
});
