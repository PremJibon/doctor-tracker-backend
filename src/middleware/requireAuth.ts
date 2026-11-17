import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { TokenPayload } from "../services/auth.service.js";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(ApiError.unauthenticated("Authentication required. Bearer token missing.", "UNAUTHENTICATED"));
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    next(ApiError.unauthenticated("Authentication token is missing.", "UNAUTHENTICATED"));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;

    if (!decoded.sub || decoded.role !== "admin") {
      next(ApiError.forbidden("Access denied: Admin role required", "FORBIDDEN"));
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(ApiError.unauthenticated("Access token expired", "TOKEN_EXPIRED"));
      return;
    }
    next(ApiError.unauthenticated("Invalid access token", "INVALID_TOKEN"));
  }
};
