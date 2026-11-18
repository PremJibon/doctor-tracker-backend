import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

/**
 * Returns true if the given origin is explicitly allowed.
 * - Any origin in env.CLIENT_ORIGIN (exact match)
 * - In non-production: exactly http://localhost:3000
 */
export const isOriginAllowed = (origin: string): boolean => {
  if (env.CLIENT_ORIGIN.includes(origin)) return true;
  if (env.NODE_ENV !== "production" && origin === "http://localhost:3000") return true;
  return false;
};

/**
 * Middleware: if an Origin header is present and NOT in the allowlist, return 403.
 * Applied to cookie-mutating routes (/auth/refresh, /auth/logout) to prevent
 * CSRF from cross-origin requests that CORS alone cannot block for non-simple requests.
 */
export const requireAllowedOrigin = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;
  if (origin && !isOriginAllowed(origin)) {
    res.status(403).json({ error: { code: "FORBIDDEN_ORIGIN", message: "Origin not allowed" } });
    return;
  }
  next();
};
