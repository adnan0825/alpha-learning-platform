import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import {
  authenticate,
  requireInstructor,
  AuthRequest,
} from "../middleware/auth";
import { query } from "../config/db";
import { getJwtSecret } from "../config/env";

const router = Router();
const uploadsDir = path.join(__dirname, "../../uploads"); // Match static serving: backend/uploads
const videoTempDir = path.join(__dirname, "../../private-media/video-temp");
const videoStorageDir = path.join(__dirname, "../../private-media/videos");
const maxVideoSizeMb = Math.max(
  1,
  Number.parseInt(process.env.MAX_VIDEO_SIZE_MB || "200", 10) || 200,
);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safeName = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${uniqueSuffix}-${safeName || "file"}`);
  },
});

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(videoTempDir, { recursive: true });
    cb(null, videoTempDir);
  },
  filename: (_req, _file, cb) => {
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.upload`);
  },
});

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv|mkv|avi)$/i;
const DOCUMENT_EXT = /\.(pdf|zip|rar|7z|doc|docx|ppt|pptx|xls|xlsx|txt)$/i;

/** Screenshots / thumbnails: images only (manual payment receipts use this too). */
const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const base = path.basename(file.originalname || "");
    const ext = path.extname(base).toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();

    const imgMime = mime.startsWith("image/") && mime !== "image/svg+xml";
    const imgExt = IMAGE_EXT.test(ext);
    const looseMime =
      mime === "application/octet-stream" ||
      mime === "binary/octet-stream" ||
      mime === "";

    if (imgExt && (imgMime || looseMime)) return cb(null, true);
    if (imgMime) return cb(null, true);

    cb(
      new Error(
        "Only image files are allowed (e.g. JPG or PNG screenshot, max 5MB)",
      ),
    );
  },
});

const documentUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path
      .extname(path.basename(file.originalname || ""))
      .toLowerCase();
    if (DOCUMENT_EXT.test(ext)) return cb(null, true);
    cb(
      new Error("Only PDF, ZIP, Office, and text files are allowed (max 25MB)"),
    );
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: maxVideoSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const base = path.basename(file.originalname || "");
    const ext = path.extname(base).toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();

    const videoMime =
      mime.startsWith("video/") ||
      mime === "application/octet-stream" ||
      mime === "";
    const videoExt = VIDEO_EXT.test(ext);

    if (videoExt && videoMime) return cb(null, true);

    cb(
      new Error(
        `Only video files are allowed (e.g. MP4, WebM, MOV, M4V, OGV), max ${maxVideoSizeMb}MB`,
      ),
    );
  },
});

/**
 * POST /api/uploads/image
 * Field `image`. Payment receipt screenshots + course images.
 */
router.post(
  "/image",
  authenticate,
  imageUpload.single("image"),
  (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const imageUrl = `/uploads/${req.file.filename}`;

      res.json({ url: imageUrl });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message || "Upload failed" });
    }
  },
);

/**
 * POST /api/uploads/file
 * Field `file`. Student assignment attachments.
 */
router.post(
  "/file",
  authenticate,
  documentUpload.single("file"),
  (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({
      url: `/uploads/${req.file.filename}`,
      filename: req.file.originalname,
      size: req.file.size,
      contentType: req.file.mimetype,
    });
  },
);

/**
 * POST /api/uploads/video
 * Field `video`. Secured application-managed videos for landing page, course previews, and lesson content.
 */
router.post(
  "/video",
  authenticate,
  requireInstructor,
  videoUpload.single("video"),
  async (req: Request, res: Response) => {
    let temporaryPath = req.file?.path;
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No video uploaded" });
      }

      const header = fs.readFileSync(req.file.path).subarray(0, 12);
      const isMp4Family = header.subarray(4, 8).toString("ascii") === "ftyp";
      const isWebmOrMkv = header
        .subarray(0, 4)
        .equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
      const isOgg = header.subarray(0, 4).toString("ascii") === "OggS";
      const isAvi =
        header.subarray(0, 4).toString("ascii") === "RIFF" &&
        header.subarray(8, 12).toString("ascii") === "AVI ";

      if (!isMp4Family && !isWebmOrMkv && !isOgg && !isAvi) {
        fs.rmSync(req.file.path, { force: true });
        temporaryPath = undefined;
        return res.status(400).json({ error: "Video validation failed" });
      }

      fs.mkdirSync(videoStorageDir, { recursive: true });
      const extensionByMime: Record<string, string> = {
        "video/mp4": ".mp4",
        "video/webm": ".webm",
        "video/quicktime": ".mov",
        "video/ogg": ".ogv",
        "video/x-matroska": ".mkv",
        "video/x-msvideo": ".avi",
      };
      const extension = extensionByMime[req.file.mimetype.toLowerCase()];
      if (!extension) {
        fs.rmSync(req.file.path, { force: true });
        temporaryPath = undefined;
        return res.status(400).json({ error: "Unsupported video format" });
      }
      const storedFilename = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
      const finalPath = path.join(videoStorageDir, storedFilename);
      fs.renameSync(req.file.path, finalPath);
      temporaryPath = undefined;

      let mediaId: string;
      const visibility =
        req.body.visibility === "public" &&
        ((req as any).user.role === "admin" ||
          (req as any).user.role === "instructor")
          ? "public"
          : "protected";
      try {
        const mediaResult = await query(
          `INSERT INTO media
             (original_name, storage_key, mime_type, file_size, media_type, visibility, status, created_by)
           VALUES ($1, $2, $3, $4, 'video', $5, 'ready', $6)
           RETURNING id`,
          [
            path.basename(req.file.originalname),
            storedFilename,
            req.file.mimetype,
            req.file.size,
            visibility,
            (req as any).user.id,
          ],
        );
        mediaId = String(mediaResult.rows[0].id);
      } catch (databaseError) {
        fs.rmSync(finalPath, { force: true });
        throw databaseError;
      }

      const videoUrl = `/api/uploads/video/${encodeURIComponent(storedFilename)}`;

      res.json({
        url: videoUrl,
        filename: storedFilename,
        mediaId,
        visibility,
        status: "ready",
        size: req.file.size,
        contentType: req.file.mimetype,
      });
    } catch (error: any) {
      if (temporaryPath) fs.rmSync(temporaryPath, { force: true });
      console.error("Video upload error:", error);
      res.status(500).json({ error: "Video upload failed" });
    }
  },
);

async function canAccessProtectedVideo(
  user: NonNullable<AuthRequest["user"]>,
  filename: string,
  createdBy: number,
) {
  if (user.role === "admin" || user.id === createdBy) return true;
  const mediaUrlPart = `%${filename}%`;
  const access = await query(
    `SELECT EXISTS (
       SELECT 1 FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = $1
         AND (c.intro_video_url LIKE $2 OR c.video_links::text LIKE $2)
     ) OR EXISTS (
       SELECT 1 FROM enrollments e
       JOIN modules m ON m.course_id = e.course_id
       JOIN lessons l ON l.module_id = m.id
       WHERE e.user_id = $1 AND l.video_url LIKE $2
     ) OR EXISTS (
       SELECT 1 FROM courses c
       WHERE c.instructor_id = $1
         AND (c.intro_video_url LIKE $2 OR c.video_links::text LIKE $2)
     ) OR EXISTS (
       SELECT 1 FROM courses c
       JOIN modules m ON m.course_id = c.id
       JOIN lessons l ON l.module_id = m.id
       WHERE c.instructor_id = $1 AND l.video_url LIKE $2
     ) AS allowed`,
    [user.id, mediaUrlPart],
  );
  return Boolean(access.rows[0]?.allowed);
}

router.get(
  "/video/:filename/access",
  async (req: AuthRequest, res: Response) => {
    const filename = path.basename(req.params.filename);
    if (filename !== req.params.filename || filename.includes("..")) {
      return res.status(400).json({ error: "Invalid video name" });
    }
    try {
      const result = await query(
        "SELECT visibility, created_by FROM media WHERE storage_key = $1",
        [filename],
      );
      if (!result.rows[0]) {
        return res.status(404).json({ error: "Video not found" });
      }
      const preview = await query(
        `SELECT EXISTS (
           SELECT 1
           FROM courses c
           WHERE c.is_published = true
             AND (
               c.intro_video_url LIKE $1
               OR EXISTS (
                 SELECT 1
                 FROM jsonb_array_elements(COALESCE(c.video_links, '[]'::jsonb)) AS lesson
                 WHERE lesson->>'url' LIKE $1
                   AND COALESCE((lesson->>'isFree')::boolean, (lesson->>'is_free')::boolean, false) = true
               )
             )
         ) AS allowed`,
        [`%${filename}%`],
      );
      if (preview.rows[0]?.allowed) {
        const access = jwt.sign({ media: filename }, getJwtSecret(), {
          expiresIn: "5m",
        });
        return res.json({
          url: `/api/uploads/video/${encodeURIComponent(filename)}?access=${encodeURIComponent(access)}`,
        });
      }
      if (result.rows[0].visibility === "public") {
        const access = jwt.sign({ media: filename }, getJwtSecret(), {
          expiresIn: "5m",
        });
        return res.json({
          url: `/api/uploads/video/${encodeURIComponent(filename)}?access=${encodeURIComponent(access)}`,
        });
      }
      authenticate(req as AuthRequest, res, async () => {
        try {
          const user = (req as AuthRequest).user!;
          if (
            !(await canAccessProtectedVideo(
              user,
              filename,
              Number(result.rows[0].created_by),
            ))
          ) {
            return res
              .status(403)
              .json({ error: "You do not have access to this video" });
          }
          const access = jwt.sign(
            { media: filename, userId: user.id },
            getJwtSecret(),
            { expiresIn: "5m" },
          );
          res.json({
            url: `/api/uploads/video/${encodeURIComponent(filename)}?access=${encodeURIComponent(access)}`,
          });
        } catch {
          res.status(500).json({ error: "Video unavailable" });
        }
      });
    } catch {
      res.status(500).json({ error: "Video unavailable" });
    }
  },
);

router.get("/video/:filename", (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  if (filename !== req.params.filename || filename.includes("..")) {
    return res.status(400).json({ error: "Invalid video name" });
  }

  const filePath = path.join(videoStorageDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Video not found" });
  }

  query("SELECT visibility, created_by FROM media WHERE storage_key = $1", [
    filename,
  ])
    .then((result) => {
      const access = req.query.access;
      if (typeof access !== "string") {
        res.status(401).json({ error: "Video access token required" });
        return;
      }
      let payload: { media?: string; userId?: number };
      try {
        payload = jwt.verify(access, getJwtSecret()) as {
          media?: string;
          userId?: number;
        };
      } catch {
        res.status(401).json({ error: "Invalid or expired video access" });
        return;
      }
      if (payload.media !== filename) {
        res.status(403).json({ error: "Invalid video access" });
        return;
      }
      if (payload.userId !== undefined) {
        authenticate(req as AuthRequest, res, () => {
          if ((req as AuthRequest).user?.id !== payload.userId) {
            res.status(403).json({ error: "Invalid video access" });
            return;
          }
          streamVideoFile(filePath, req, res);
        });
        return;
      }
      streamVideoFile(filePath, req, res);
    })
    .catch(() => res.status(500).json({ error: "Video unavailable" }));
});

function streamVideoFile(filePath: string, req: Request, res: Response) {
  const filename = path.basename(filePath);

  const stat = fs.statSync(filePath);
  const extension = path.extname(filename).toLowerCase();
  const contentTypes: Record<string, string> = {
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".ogv": "video/ogg",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
  };
  const contentType = contentTypes[extension] || "application/octet-stream";
  const range = req.headers.range;

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!range) {
    res.setHeader("Content-Length", stat.size);
    return fs.createReadStream(filePath).pipe(res);
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) return res.status(416).end();
  const start = match[1]
    ? Number(match[1])
    : Math.max(stat.size - Number(match[2]), 0);
  const end = match[2] ? Number(match[2]) : stat.size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end >= stat.size ||
    start > end
  ) {
    return res
      .status(416)
      .setHeader("Content-Range", `bytes */${stat.size}`)
      .end();
  }

  res.status(206);
  res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
  res.setHeader("Content-Length", end - start + 1);
  return fs.createReadStream(filePath, { start, end }).pipe(res);
}

router.use((err: any, req: Request, res: Response, next: any) => {
  if (req.file?.path) fs.rmSync(req.file.path, { force: true });
  console.error("Multer error:", err);
  if (err.code === "LIMIT_FILE_SIZE") {
    const isVideo = (req as any).file || (req as any).files;
    const maxText = isVideo
      ? `Maximum size is ${maxVideoSizeMb}MB`
      : "Maximum size is 5MB";
    return res.status(400).json({ error: `File size too large. ${maxText}` });
  }
  res.status(400).json({ error: err.message || "Upload failed" });
});

export default router;
