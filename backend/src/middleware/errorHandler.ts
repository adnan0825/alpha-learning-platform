import type { ErrorRequestHandler, Request, Response } from "express";

export type ApiError = Error & {
  statusCode?: number;
  code?: string;
  status?: number;
};

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  details?: unknown,
) {
  const body: { error: string; details?: unknown } = { error: message };
  if (process.env.NODE_ENV !== "production" && details !== undefined) {
    body.details = details;
  }
  return res.status(statusCode).json(body);
}

export const notFoundHandler = (req: Request, res: Response) => {
  sendError(res, 404, `Route not found: ${req.method} ${req.path}`);
};

export const errorHandler: ErrorRequestHandler = (
  error: ApiError,
  req,
  res,
  _next,
) => {
  const statusCode = Number(error.statusCode || error.status || 500);
  const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
  const message = safeStatus >= 500 ? "Internal server error" : error.message;

  console.error("API request failed", {
    method: req.method,
    path: req.path,
    status: safeStatus,
    message: error.message,
  });

  return sendError(
    res,
    safeStatus,
    message,
    safeStatus >= 500 ? undefined : error.code,
  );
};
