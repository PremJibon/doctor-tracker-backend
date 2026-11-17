import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Too many login attempts from this IP. Please try again after 15 minutes.",
      },
    });
  },
});
