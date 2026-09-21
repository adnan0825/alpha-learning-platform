import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import * as authService from "../services/authService";

const router = Router();

const AUTH_COOKIE_NAME = "alpha_token";
const AUTH_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
}

function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

function authResponse(result: { user: unknown; token: string }) {
  return { user: result.user, token: result.token };
}

/** Password auth is off unless explicitly enabled (local testing only). Google Sign-In is always available when configured. */
const passwordAuthAllowed = () =>
  process.env.AUTH_ALLOW_PASSWORD_LOGIN === "true";

router.post("/signup", async (req: AuthRequest, res: Response) => {
  if (!passwordAuthAllowed()) {
    return res.status(403).json({
      error: "Email/password sign-up is disabled. Use Google Sign-In.",
    });
  }
  try {
    const { email, password, name } = req.body;
    const result = await authService.register(email, password, name);
    setAuthCookie(res, result.token);
    res.status(201).json(authResponse(result));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Alias for /signup for backwards compatibility
router.post("/register", async (req: AuthRequest, res: Response) => {
  if (!passwordAuthAllowed()) {
    return res.status(403).json({
      error: "Email/password sign-up is disabled. Use Google Sign-In.",
    });
  }
  try {
    const { email, password, name } = req.body;
    const result = await authService.register(email, password, name);
    setAuthCookie(res, result.token);
    res.status(201).json(authResponse(result));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/login", async (req: AuthRequest, res: Response) => {
  if (!passwordAuthAllowed()) {
    return res
      .status(403)
      .json({ error: "Password sign-in is disabled. Use Google Sign-In." });
  }
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    setAuthCookie(res, result.token);
    res.json(authResponse(result));
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

router.post("/logout", (_req: AuthRequest, res: Response) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

/** Body: { credential: string } — Google ID token from GIS / @react-oauth/google */
router.post("/google", async (req: AuthRequest, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential || typeof credential !== "string") {
      return res.status(400).json({ error: "Missing Google credential" });
    }
    const result = await authService.loginWithGoogle(credential);
    setAuthCookie(res, result.token);
    res.json(authResponse(result));
  } catch (error: any) {
    const msg = error.message || "Google sign-in failed";
    const status = msg.includes("not configured") ? 503 : 401;
    res.status(status).json({ error: msg });
  }
});

/** Body: { code: string, redirectUri: string } — OAuth2 authorization code from redirect flow (same redirectUri as used with Google). */
router.post("/google/code", async (req: AuthRequest, res: Response) => {
  try {
    const { code, redirectUri } = req.body;
    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Missing authorization code" });
    }
    if (!redirectUri || typeof redirectUri !== "string") {
      return res.status(400).json({ error: "Missing redirectUri" });
    }
    const result = await authService.loginWithGoogleAuthCode(code, redirectUri);
    setAuthCookie(res, result.token);
    res.json(authResponse(result));
  } catch (error: any) {
    const msg = error.message || "Google sign-in failed";
    const status =
      msg.includes("not configured") || msg.includes("GOOGLE_CLIENT_SECRET")
        ? 503
        : 401;
    res.status(status).json({ error: msg });
  }
});

router.get(
  "/profile",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await authService.getProfile(req.user!.id);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.put(
  "/profile",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, bio, avatar } = req.body;
      const user = await authService.updateProfile(req.user!.id, {
        name,
        bio,
        avatar,
      });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get("/instructors", async (req: AuthRequest, res: Response) => {
  try {
    const instructors = await authService.getInstructors();
    res.json(instructors);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
