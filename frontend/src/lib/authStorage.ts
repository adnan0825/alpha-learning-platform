const TOKEN_KEY = "alpha_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOKEN_KEY, token);
}

/**
 * Keep auth state in the current browser session only. Using sessionStorage here
 * prevents one user/logout flow from clearing another tab or browser session's
 * independent identity.
 */
export function clearStoredToken(): void {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(TOKEN_KEY);
}
