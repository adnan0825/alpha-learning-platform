import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/env";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  const cookieHeader = req.headers.cookie || "";

  const cookieToken = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("alpha_token="))
    ?.slice("alpha_token=".length);

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : cookieToken
      ? decodeURIComponent(cookieToken)
      : null;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      id: number | string;
      email: string;
      role: string;
    };
    const id =
      typeof decoded.id === "string" ? parseInt(decoded.id, 10) : decoded.id;
    if (!Number.isFinite(id)) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = { id, email: decoded.email, role: decoded.role };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    next();
  };
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Not authorized - admin access required" });
  }

  next();
};

export const requireInstructor = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.user.role !== "instructor" && req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Not authorized - instructor access required" });
  }

  next();
};
