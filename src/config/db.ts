import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";

// Ensure Node.js resolves MongoDB SRV records via reliable public DNS resolvers
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore if custom DNS cannot be set
}

export const connectDB = async (): Promise<void> => {
  mongoose.set("autoIndex", env.NODE_ENV !== "production");

  mongoose.connection.on("connected", () => {
    console.info("MongoDB connected successfully.");
  });

  mongoose.connection.on("error", (err: Error) => {
    console.error("MongoDB connection error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected.");
  });

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error connecting to MongoDB";
    console.error("Failed to connect to MongoDB on startup:", message);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};
