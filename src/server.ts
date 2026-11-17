import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";

const startServer = async (): Promise<void> => {
  try {
    // Attempt DB connection, but allow server startup even if DB is temporarily unreachable in dev
    try {
      await connectDB();
    } catch (dbError) {
      console.warn("⚠️ Database connection failed on start. Server will continue running:", (dbError as Error).message);
    }

    const server = app.listen(env.PORT, () => {
      console.info(`🚀 Server running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`);
    });

    const shutdown = (signal: string) => {
      console.info(`${signal} signal received: closing HTTP server`);
      server.close(() => {
        console.info("HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Fatal error during server startup:", error);
    process.exit(1);
  }
};

void startServer();
