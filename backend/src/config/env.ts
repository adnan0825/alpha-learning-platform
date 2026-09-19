export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "Missing JWT_SECRET. Set JWT_SECRET in your environment before starting the backend.",
    );
  }
  return secret;
}

export function assertRequiredEnvironment(): void {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    getJwtSecret();
  }

  const hasGoogleConfig = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
  if (isProduction && !hasGoogleConfig) {
    throw new Error(
      "Production environment requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for Google sign-in.",
    );
  }
}
