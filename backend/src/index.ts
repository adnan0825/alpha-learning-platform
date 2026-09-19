import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { pool } from "./config/db";
import { assertRequiredEnvironment } from "./config/env";
import authRoutes from "./routes/auth";
import courseRoutes from "./routes/courses";
import lessonRoutes from "./routes/lessons";
import enrollmentRoutes from "./routes/enrollments";
import progressRoutes from "./routes/progress";
import analyticsRoutes from "./routes/analytics";
import uploadsRoutes from "./routes/uploads";
import usersRoutes from "./routes/users";
import quizzesRoutes from "./routes/quizzes";
import discussionsRoutes from "./routes/discussions";
import certificatesRoutes from "./routes/certificates";
import adminRoutes from "./routes/admin";
import settingsRoutes from "./routes/settings";
import feedbackRoutes from "./routes/feedback";
import manualPaymentsRoutes from "./routes/manualPayments";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import path from "path";

dotenv.config();
assertRequiredEnvironment();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const apiRateLimit = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  limit: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});
const authRateLimit = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts. Please try again later.",
  },
});

/** Extra allowed origins from env, e.g. CORS_ORIGINS=https://app.example.com,http://localhost:4173 */
const envCorsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const defaultCorsOrigins = new Set([
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4173",
  "https://alpha.online",
  "https://www.alpha.online",
]);

function isAllowedCorsOrigin(origin: string): boolean {
  if (envCorsOrigins.includes(origin) || defaultCorsOrigins.has(origin))
    return true;
  // Any local dev port (Vite/Webpack preview, etc.)
  if (/^https?:\/\/localhost(?::\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin)) return true;
  return false;
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use("/api", apiRateLimit);
app.use("/api/auth", authRateLimit);
app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (no Origin) — allow
      if (!origin) {
        callback(null, true);
        return;
      }
      if (isAllowedCorsOrigin(origin)) {
        callback(null, origin);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// Serve uploaded files statically at /uploads
const uploadsDir = path.join(__dirname, "../uploads");
app.use("/uploads", express.static(uploadsDir, { fallthrough: true }));

app.get("/health", async (req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

app.get("/api", (req: Request, res: Response) => {
  res.json({ message: "Alpha API v1" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/modules", lessonRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/quizzes", quizzesRoutes);
app.use("/api/discussions", discussionsRoutes);
app.use("/api/certificates", certificatesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/manual-payments", manualPaymentsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await pool.query("SELECT 1");
    app.listen(PORT, () => {
      console.log("Alpha API started", {
        port: PORT,
        environment: process.env.NODE_ENV || "development",
        database: "connected",
      });
    });
  } catch (error) {
    console.error("Alpha API startup failed: database unavailable", error);
    process.exit(1);
  }
}

start();
