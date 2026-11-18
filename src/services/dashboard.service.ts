import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";

export interface DashboardSummary {
  totalDoctors: number;
  totalPatients: number;
  avgPatientsPerDoctor: number;
}

export interface PatientsPerDoctor {
  doctorId: string;
  name: string;
  count: number;
}

export interface PatientTrendPoint {
  date: string;
  count: number;
}

export interface ConditionDistribution {
  condition: string;
  count: number;
}

export class DashboardService {
  /**
   * Aggregate total counts and average patient load per doctor.
   * Uses parallel countDocuments for throughput; avg computed dynamically
   * to avoid storing a denormalized counter that could drift out of sync.
   */
  static async getSummary(): Promise<DashboardSummary> {
    const [totalDoctors, totalPatients] = await Promise.all([
      Doctor.countDocuments(),
      Patient.countDocuments(),
    ]);

    const avgPatientsPerDoctor =
      totalDoctors > 0 ? Number((totalPatients / totalDoctors).toFixed(2)) : 0;

    return {
      totalDoctors,
      totalPatients,
      avgPatientsPerDoctor,
    };
  }

  /**
   * Top 10 doctors ranked by total patient count.
   * Groups by doctorId first to minimize data before the $lookup join,
   * then limits to top 10 to avoid loading the full roster into memory.
   * Preserves patients whose doctor reference is missing (dangling refs)
   * instead of dropping them, so workload counts remain accurate.
   */
  static async getPatientsPerDoctor(): Promise<PatientsPerDoctor[]> {
    const results = await Patient.aggregate<PatientsPerDoctor>([
      // Group patients by assigned doctorId and count occurrences;
      // done before $lookup to reduce the working set joined against doctors.
      {
        $group: {
          _id: "$doctorId",
          count: { $sum: 1 },
        },
      },
      // Sort descending so doctors with the highest caseload appear first;
      // required before $limit to guarantee we keep the true top 10.
      {
        $sort: { count: -1 },
      },
      // Restrict to top 10 doctors to bound response size and lookup cost.
      {
        $limit: 10,
      },
      // Left outer join to doctor collection to retrieve doctor's full name.
      // Use preserveNullAndEmptyArrays so patients with a missing doctor ref
      // are not silently dropped from workload counts.
      {
        $lookup: {
          from: "doctors",
          localField: "_id",
          foreignField: "_id",
          as: "doctor",
        },
      },
      // Unwind the joined doctor array; preserveNullAndEmptyArrays keeps
      // documents with no matching doctor rather than discarding them.
      {
        $unwind: {
          path: "$doctor",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Project clean response shape; fall back to doctorId string when name is missing.
      {
        $project: {
          doctorId: { $toString: "$_id" },
          name: { $ifNull: ["$doctor.name", "Unknown Doctor"] },
          count: 1,
          _id: 0,
        },
      },
    ]);

    return results;
  }

  /**
   * Aggregate time-series patient admissions by day or month over a specified range.
   * Utilizes idx_patients_admittedAt index for the initial $match stage.
   */
  static async getPatientsOverTime(
    range: "7d" | "30d" | "12m" = "30d"
  ): Promise<PatientTrendPoint[]> {
    const now = new Date();
    let startDate: Date;
    let dateFormat: string;

    if (range === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFormat = "%Y-%m-%d";
    } else if (range === "12m") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      dateFormat = "%Y-%m";
    } else {
      // Default: 30d
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFormat = "%Y-%m-%d";
    }

    const results = await Patient.aggregate<PatientTrendPoint>([
      // Stage 1: Filter admissions after startDate (backed by { admittedAt: -1 } index)
      {
        $match: {
          admittedAt: { $gte: startDate },
        },
      },
      // Stage 2: Group by formatted date string (day or month) and count admissions
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: "$admittedAt",
            },
          },
          count: { $sum: 1 },
        },
      },
      // Stage 3: Sort chronologically by date
      {
        $sort: { _id: 1 },
      },
      // Stage 4: Project clean response format
      {
        $project: {
          date: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    return results;
  }

  /**
   * Aggregate distribution of patients grouped by diagnosed medical condition.
   * Backed by idx_patients_condition_createdAt compound index.
   */
  static async getConditions(): Promise<ConditionDistribution[]> {
    const results = await Patient.aggregate<ConditionDistribution>([
      // Stage 1: Group patients by condition string and count
      {
        $group: {
          _id: "$condition",
          count: { $sum: 1 },
        },
      },
      // Stage 2: Sort descending by prevalence
      {
        $sort: { count: -1 },
      },
      // Stage 3: Project clean response shape
      {
        $project: {
          condition: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    return results;
  }
}
