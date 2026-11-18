import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response<ErrorResponseBody>,
  _next: NextFunction
): void => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Handle generic / unexpected error
  const message =
    env.NODE_ENV === "production"
      ? "An unexpected error occurred"
      : err instanceof Error
      ? err.message
      : "Internal server error";

  // Log sanitized error details; never stack traces or secrets to stdout
  if (env.NODE_ENV === "production") {
    console.error("Unhandled error:", {
      code: err instanceof ApiError ? err.code : "INTERNAL_ERROR",
      statusCode: err instanceof ApiError ? err.statusCode : 500,
      message: err instanceof Error ? err.message : String(err),
    });
  } else {
    console.error("Unhandled error:", err);
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message,
    },
  });
};
