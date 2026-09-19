const TOKEN_KEY = "alpha_token";

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}
