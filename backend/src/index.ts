import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { pool } from "./config/db";
import { assertRequiredEnvironment } from "./config/env";
import { ensureQuizStatusColumn } from "./config/ensureQuizSchema";
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
import assignmentsRoutes from "./routes/assignments";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import path from "path";
import {
  getListenHost,
  getListenPort,
  isAllowedCorsOrigin,
} from "./config/runtime";

dotenv.config();
assertRequiredEnvironment();

const app: Application = express();
app.set("trust proxy", 1);
const PORT = getListenPort();
const HOST = getListenHost();
const staleLearningPathTitles = [
  "Full Stack Web Development",
  "Data Science & Machine Learning",
  "UI/UX Design Master",
];
const staleLearningPathDescriptions = [
  "Complete path from beginner to full stack developer",
  "Learn Python, data analysis, and ML fundamentals",
  "Master design principles, Figma, and user experience",
];

async function cleanupStaleSeedLearningPaths() {
  try {
    await pool.query(
      `
        DELETE FROM learning_path_courses
        WHERE learning_path_id IN (
          SELECT id
          FROM learning_paths
          WHERE created_by = 1
            AND title = ANY($1::text[])
            AND description = ANY($2::text[])
        );
      `,
      [staleLearningPathTitles, staleLearningPathDescriptions],
    );

    await pool.query(
      `
        DELETE FROM learning_paths
        WHERE created_by = 1
          AND title = ANY($1::text[])
          AND description = ANY($2::text[]);
      `,
      [staleLearningPathTitles, staleLearningPathDescriptions],
    );
  } catch (error) {
    console.warn("Skipping stale learning path cleanup:", error);
  }
}

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
app.use("/api/assignments", assignmentsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await pool.query("SELECT 1");
    await ensureQuizStatusColumn();
    await cleanupStaleSeedLearningPaths();
    app.listen(PORT, HOST, () => {
      console.log("Alpha API started", {
        host: HOST,
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
