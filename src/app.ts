import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { env } from "./config/env.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { isOriginAllowed } from "./middleware/corsGuard.js";

import authRoutes from "./routes/auth.routes.js";
import doctorRoutes from "./routes/doctor.routes.js";
import patientRoutes from "./routes/patient.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import { apiRateLimiter } from "./middleware/rateLimit.js";

const app: Application = express();

// Required behind Render reverse proxy
app.set("trust proxy", 1);

// Security & request parsing middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Health check endpoints
const healthHandler = (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
};
app.get("/api/health", healthHandler);
app.get("/health", healthHandler);

// API Routes
app.use(apiRateLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Fallback 404 & centralized error handling
app.use(notFound);
app.use(errorHandler);

export default app;
