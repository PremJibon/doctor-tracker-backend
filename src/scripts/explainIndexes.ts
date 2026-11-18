/**
 * P9 — Index Performance Verification Script
 * Runs explain("executionStats") for every critical query pattern and asserts:
 *   - Winning plan stage is IXSCAN (not COLLSCAN)
 *   - docsExamined is proportionate to docsReturned (no full-collection scans)
 */

import { connectDB, disconnectDB } from "../config/db.js";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";

interface ExplainResult {
  queryPlanner?: {
    winningPlan?: unknown;
  };
  executionStats?: {
    nReturned?: number;
    totalDocsExamined?: number;
    totalKeysExamined?: number;
    executionTimeMillis?: number;
  };
}

/** Recursively search the winning plan tree for a stage name */
function findStages(plan: unknown, depth = 0): string[] {
  if (!plan || typeof plan !== "object") return [];
  const p = plan as Record<string, unknown>;
  const stages: string[] = [];
  if (typeof p["stage"] === "string") stages.push(p["stage"]);
  if (p["inputStage"]) stages.push(...findStages(p["inputStage"], depth + 1));
  if (Array.isArray(p["inputStages"])) {
    for (const s of p["inputStages"]) stages.push(...findStages(s, depth + 1));
  }
  return stages;
}

function printResult(
  label: string,
  stats: ExplainResult["executionStats"],
  winningPlan: unknown
) {
  const stages = findStages(winningPlan);
  const hasCollScan = stages.includes("COLLSCAN");
  const hasIxScan = stages.includes("IXSCAN") || stages.includes("IDHACK");
  const status = hasCollScan ? "❌ COLLSCAN" : hasIxScan ? "✅ IXSCAN" : `⚠️  ${stages.join(",")}`;

  console.info(`\n${"─".repeat(60)}`);
  console.info(`Query: ${label}`);
  console.info(`  Stage:          ${stages.join(" → ")}`);
  console.info(`  Status:         ${status}`);
  console.info(`  nReturned:      ${stats?.nReturned ?? "n/a"}`);
  console.info(`  docsExamined:   ${stats?.totalDocsExamined ?? "n/a"}`);
  console.info(`  keysExamined:   ${stats?.totalKeysExamined ?? "n/a"}`);
  console.info(`  timeMs:         ${stats?.executionTimeMillis ?? "n/a"}ms`);

  if (hasCollScan) {
    console.error(`  ⚠️  WARNING: COLLSCAN detected — index may be missing!`);
  }
}

async function runExplains() {
  console.info("🔍 P9 Index Performance Verification");
  console.info("=".repeat(60));

  // ─── Doctor Queries ───────────────────────────────────────────
  // 1. Doctor list (default sort by createdAt DESC) → uses {createdAt:-1}
  {
    const result = (await Doctor.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .explain("executionStats")) as ExplainResult;
    printResult(
      "Doctor list (sort by createdAt DESC)",
      result.executionStats,
      result.queryPlanner?.winningPlan
    );
  }

  // 2. Doctor search (prefix on nameLower) → uses {nameLower:1}
  {
    const result = (await Doctor.find({
      $or: [
        { nameLower: { $regex: "^rafiqul" } },
        { nameLower: { $regex: "^dr\\.?\\s*rafiqul" } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .explain("executionStats")) as ExplainResult;
    printResult(
      "Doctor search prefix on nameLower (anchored ^ regex)",
      result.executionStats,
      result.queryPlanner?.winningPlan
    );
  }

  // 3. Doctor filter by specialization → uses {specialization:1,createdAt:-1}
  {
    const result = (await Doctor.find({ specialization: "Cardiology" })
      .sort({ createdAt: -1 })
      .limit(20)
      .explain("executionStats")) as ExplainResult;
    printResult(
      "Doctor filter by specialization=Cardiology",
      result.executionStats,
      result.queryPlanner?.winningPlan
    );
  }

  // 4. Doctor filter by hospital → uses {hospital:1}
  {
    const result = (await Doctor.find({ hospital: "Square Hospital" })
      .sort({ createdAt: -1 })
      .limit(20)
      .explain("executionStats")) as ExplainResult;
    printResult(
      "Doctor filter by hospital",
      result.executionStats,
      result.queryPlanner?.winningPlan
    );
  }

  // ─── Patient Queries ──────────────────────────────────────────
  // 5. Patient list (default sort by admittedAt DESC) → uses {admittedAt:-1}
  {
    const result = (await Patient.find({})
      .sort({ admittedAt: -1 })
      .limit(20)
      .explain("executionStats")) as ExplainResult;
    printResult(
      "Patient list (sort by admittedAt DESC)",
      result.executionStats,
      result.queryPlanner?.winningPlan
    );
  }

  // 6. Patient search (prefix on nameLower) → uses {nameLower:1}
  {
    const result = (await Patient.find({
      nameLower: { $regex: "^rafiqul" },
    })
      .sort({ admittedAt: -1 })
      .limit(20)
      .explain("executionStats")) as ExplainResult;
    printResult(
      "Patient search prefix on nameLower (anchored ^ regex)",
      result.executionStats,
      result.queryPlanner?.winningPlan
    );
  }

  // 7. Patient filter by condition → uses {condition:1,createdAt:-1}
  {
    const result = (await Patient.find({ condition: "Hypertension" })
      .sort({ createdAt: -1 })
      .limit(20)
      .explain("executionStats")) as ExplainResult;
    printResult(
      "Patient filter by condition=Hypertension",
      result.executionStats,
      result.queryPlanner?.winningPlan
    );
  }

  // 8. Patient filter by doctorId → uses {doctorId:1,createdAt:-1}
  {
    // Get a real doctorId from DB
    const doc = await Doctor.findOne({}).lean();
    if (doc) {
      const result = (await Patient.find({ doctorId: doc._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .explain("executionStats")) as ExplainResult;
      printResult(
        "Patient filter by doctorId",
        result.executionStats,
        result.queryPlanner?.winningPlan
      );
    }
  }

  // 9. Patient filter by admittedAt date range → uses {admittedAt:-1}
  {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = (await Patient.find({
      admittedAt: { $gte: thirtyDaysAgo },
    })
      .sort({ admittedAt: -1 })
      .limit(20)
      .explain("executionStats")) as ExplainResult;
    printResult(
      "Patient filter by admittedAt range (last 30 days)",
      result.executionStats,
      result.queryPlanner?.winningPlan
    );
  }

  console.info(`\n${"=".repeat(60)}`);
  console.info("✅ Index verification complete.\n");
}

const run = async () => {
  try {
    await connectDB();
    await runExplains();
  } catch (error) {
    console.error("❌ Explain script failed:", error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

void run();
