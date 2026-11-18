import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Doctor, IDoctor } from "../models/Doctor.js";
import { Patient, IPatient } from "../models/Patient.js";

const SPECIALIZATIONS = [
  "Cardiology",
  "Neurology",
  "Pediatrics",
  "Orthopedics",
  "Dermatology",
  "Gastroenterology",
  "Oncology",
  "Nephrology",
  "Psychiatry",
  "Ophthalmology",
  "ENT",
  "Gynecology",
  "Endocrinology",
  "Pulmonology",
  "Rheumatology",
];

const HOSPITALS = [
  "Dhaka Medical College Hospital",
  "Square Hospital",
  "United Hospital",
  "Evercare Hospital",
  "Bangabandhu Sheikh Mujib Medical University (BSMMU)",
  "BIRDEM General Hospital",
  "Labaid Specialized Hospital",
  "National Institute of Cardiovascular Diseases",
  "Kurmitola General Hospital",
  "Popular Diagnostic Centre & Hospital",
];

const CONDITIONS = [
  "Hypertension",
  "Type 2 Diabetes",
  "Bronchial Asthma",
  "Coronary Artery Disease",
  "Chronic Kidney Disease",
  "Migraine",
  "Osteoarthritis",
  "Peptic Ulcer Disease",
  "Pneumonia",
  "Dengue Fever",
  "Viral Hepatitis",
  "Acute Bronchitis",
  "Hypothyroidism",
  "Major Depressive Disorder",
  "Cataract",
  "Generalized Anxiety Disorder",
];

const FIRST_NAMES_MALE = [
  "Rafiqul",
  "Kamrul",
  "Mahfuzur",
  "Anisur",
  "Asaduzzaman",
  "Tanvir",
  "Zubair",
  "Sajid",
  "Arifur",
  "Mizanur",
  "Farhan",
  "Shahidul",
  "Mustafizur",
  "Rezaul",
  "Jashim",
  "Ziaur",
  "Delwar",
  "Enamul",
  "Golam",
  "Habibur",
];

const FIRST_NAMES_FEMALE = [
  "Farzana",
  "Tahmina",
  "Nusrat",
  "Shirin",
  "Nasreen",
  "Sabrina",
  "Rumana",
  "Dilruba",
  "Sharmin",
  "Rokeya",
  "Shamima",
  "Afroza",
  "Salma",
  "Farida",
  "Nazma",
  "Rasheda",
  "Monowara",
  "Sultana",
  "Jannatul",
  "Tasnim",
];

const LAST_NAMES = [
  "Islam",
  "Ahmed",
  "Rahman",
  "Akter",
  "Hasan",
  "Jahan",
  "Khan",
  "Begum",
  "Sultana",
  "Hossain",
  "Chowdhury",
  "Uddin",
  "Haque",
  "Bhuiyan",
  "Mia",
  "Sikder",
  "Majumder",
  "Talukder",
  "Munshi",
  "Kazi",
];

export const seedDatabase = async (): Promise<void> => {
  console.info("🌱 Starting comprehensive database seeding...");

  // 1. Clear existing collections for a clean, idempotent seed
  console.info("🧹 Cleaning existing data...");
  await Promise.all([
    User.deleteMany({}),
    Doctor.deleteMany({}),
    Patient.deleteMany({}),
  ]);

  // 2. Sync all indexes defined on schemas
  console.info("⚡ Syncing database indexes...");
  await Promise.all([
    User.syncIndexes(),
    Doctor.syncIndexes(),
    Patient.syncIndexes(),
  ]);

  // 3. Seed Admin Account
  console.info("👤 Creating Admin account...");
  const adminSalt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash("AdminPassword123!", adminSalt);
  await User.create({
    name: "System Administrator",
    email: "admin@doctor-tracker.com",
    passwordHash: adminPasswordHash,
    role: "admin",
  });
  console.info("-> Admin account created: admin@doctor-tracker.com / AdminPassword123!");

  // 4. Generate 40 Realistic Doctors
  console.info("👨‍⚕️ Generating 40 Doctors...");
  const doctorDocs: Partial<IDoctor>[] = [];
  const doctorEmails = new Set<string>();

  for (let i = 0; i < 40; i++) {
    const isMale = i % 2 === 0;
    const firstName = isMale
      ? FIRST_NAMES_MALE[i % FIRST_NAMES_MALE.length]
      : FIRST_NAMES_FEMALE[i % FIRST_NAMES_FEMALE.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const fullName = `Dr. ${firstName} ${lastName}`;
    const specialization = SPECIALIZATIONS[i % SPECIALIZATIONS.length];
    const hospital = HOSPITALS[i % HOSPITALS.length];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i + 1}@careguide.bd`;
    doctorEmails.add(email);

    const phone = `+8801${(7 + (i % 3))}${String(10000000 + i * 12345).slice(0, 8)}`;
    
    // Spread doctor registration dates across past 12 months
    const daysAgo = Math.floor(Math.random() * 365);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    doctorDocs.push({
      name: fullName,
      nameLower: fullName.toLowerCase().trim(),
      specialization,
      hospital,
      phone,
      email,
      createdAt,
      updatedAt: createdAt,
    });
  }

  const createdDoctors = await Doctor.insertMany(doctorDocs);
  console.info(`-> Successfully created ${createdDoctors.length} doctors.`);

  // 5. Generate ~1,500 Realistic Patients (distributed across 40 doctors)
  console.info("🏥 Generating 1,500 Patients across 12-month admission timeline...");
  const TOTAL_PATIENTS = 1500;
  const patientDocs: Partial<IPatient>[] = [];

  const now = Date.now();
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < TOTAL_PATIENTS; i++) {
    const assignedDoctor = createdDoctors[i % createdDoctors.length];
    const isMale = Math.random() > 0.48;
    const gender = isMale ? "Male" : "Female";
    const firstName = isMale
      ? FIRST_NAMES_MALE[Math.floor(Math.random() * FIRST_NAMES_MALE.length)]
      : FIRST_NAMES_FEMALE[Math.floor(Math.random() * FIRST_NAMES_FEMALE.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const fullName = `${firstName} ${lastName}`;

    const age = Math.floor(Math.random() * 75) + 10; // Age 10 to 85
    const condition = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
    const phone = `+8801${Math.floor(Math.random() * 5) + 3}${String(Math.floor(Math.random() * 90000000) + 10000000).slice(0, 8)}`;

    // Admission dates realistically distributed across the past 365 days
    const admissionOffset = Math.floor(Math.random() * ONE_YEAR_MS);
    const admittedAt = new Date(now - admissionOffset);
    const createdAt = admittedAt;

    patientDocs.push({
      name: fullName,
      nameLower: fullName.toLowerCase().trim(),
      age,
      gender,
      phone,
      condition,
      doctorId: assignedDoctor._id,
      admittedAt,
      createdAt,
      updatedAt: createdAt,
    });
  }

  // Insert in batches of 500 for optimal insert performance
  const BATCH_SIZE = 500;
  for (let i = 0; i < patientDocs.length; i += BATCH_SIZE) {
    const batch = patientDocs.slice(i, i + BATCH_SIZE);
    await Patient.insertMany(batch);
  }
  console.info(`-> Successfully created ${TOTAL_PATIENTS} patients.`);

  // 6. Verify Totals
  const [docCount, patCount, userCount] = await Promise.all([
    Doctor.countDocuments(),
    Patient.countDocuments(),
    User.countDocuments(),
  ]);

  console.info("\n🎉 Database Seeding Complete!");
  console.info(`   Users:    ${userCount}`);
  console.info(`   Doctors:  ${docCount}`);
  console.info(`   Patients: ${patCount}`);
  console.info(`   Avg/Doc:  ${(patCount / docCount).toFixed(1)} patients/doctor\n`);
};

const run = async () => {
  try {
    await connectDB();
    await seedDatabase();
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

// Run if called directly
if (process.argv[1] && process.argv[1].includes("seed")) {
  void run();
}
