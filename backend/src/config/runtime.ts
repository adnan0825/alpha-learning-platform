export function getConfiguredCorsOrigins(): string[] {
  return (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getPublicBaseUrl(): string {
  return (process.env.PUBLIC_BASE_URL || process.env.APP_PUBLIC_URL || "").trim();
}

export function buildPublicUrl(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const baseUrl = getPublicBaseUrl();
  if (!baseUrl) return trimmed;

  try {
    return new URL(trimmed, `${baseUrl.replace(/\/$/, "")}/`).toString();
  } catch {
    return trimmed;
  }
}

export function getListenHost(): string {
  return process.env.HOST || "0.0.0.0";
}

export function getListenPort(): number {
  const port = Number(process.env.PORT || 3000);
  return Number.isFinite(port) ? port : 3000;
}

export function isAllowedCorsOrigin(origin: string): boolean {
  if (!origin) return true;

  const configuredOrigins = new Set(getConfiguredCorsOrigins());
  if (configuredOrigins.has(origin)) return true;

  const defaultOrigins = new Set([
    "http://localhost:8080",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173",
    "https://alpha.online",
    "https://www.alpha.online",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:4173",
  ]);
  if (defaultOrigins.has(origin)) return true;

  const localhostPattern = /^https?:\/\/localhost(?::\d+)?$/i;
  const loopbackPattern = /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i;
  if (localhostPattern.test(origin) || loopbackPattern.test(origin)) return true;

  const cloudPatterns = [
    /^https?:\/\/([a-z0-9-]+\.)*pages\.dev(?::\d+)?$/i,
    /^https?:\/\/([a-z0-9-]+\.)*onrender\.com(?::\d+)?$/i,
    /^https?:\/\/([a-z0-9-]+\.)*railway\.app(?::\d+)?$/i,
    /^https?:\/\/([a-z0-9-]+\.)*vercel\.app(?::\d+)?$/i,
    /^https?:\/\/([a-z0-9-]+\.)*cloudflare\.dev(?::\d+)?$/i,
  ];

  return cloudPatterns.some((pattern) => pattern.test(origin));
}
