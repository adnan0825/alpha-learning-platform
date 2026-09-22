const TOKEN_KEY = "alpha_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  const localToken = localStorage.getItem(TOKEN_KEY);
  if (localToken) return localToken;

  return sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(TOKEN_KEY, token);
}

/**
 * Clear the shared auth state so logout is consistent across tabs.
 */
export function clearStoredToken(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}
