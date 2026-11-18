import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { env } from "../config/env.js";

const REFRESH_COOKIE_NAME = "refreshToken";

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: (env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/auth",
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);

  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());

  res.status(200).json({
    accessToken: result.accessToken,
    user: result.user,
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE_NAME];
  const result = await AuthService.refresh(token || "");

  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());

  res.status(200).json({
    accessToken: result.accessToken,
  });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  const userId = (_req as Request & { user?: { sub?: string } }).user?.sub;
  if (userId) {
    await AuthService.revoke(userId);
  }

  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: (env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
    path: "/api/auth",
  });

  res.status(200).json({
    message: "Logged out successfully",
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.sub;
  const user = await AuthService.getMe(userId || "");

  res.status(200).json({ user });
});
