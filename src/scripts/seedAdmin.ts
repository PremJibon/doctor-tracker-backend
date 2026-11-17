import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/User.js";

export const seedAdminUser = async (): Promise<void> => {
  const adminEmail = "admin@doctor-tracker.com";
  const adminPassword = "AdminPassword123!";

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) {
    console.info(`Admin user already exists: ${adminEmail}`);
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  await User.create({
    name: "System Administrator",
    email: adminEmail,
    passwordHash,
    role: "admin",
  });

  console.info(`✅ Admin user seeded successfully: ${adminEmail}`);
};

const run = async () => {
  try {
    await connectDB();
    await seedAdminUser();
  } catch (error) {
    console.error("❌ Failed to seed admin user:", error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

// Execute if run directly
if (process.argv[1] && process.argv[1].includes("seedAdmin")) {
  void run();
}
