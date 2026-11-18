import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";

export interface DashboardSummary {
  totalDoctors: number;
  totalPatients: number;
  avgPatientsPerDoctor: number;
  admissionsLast30d: number;
  admissionsPrev30d: number;
  newDoctorsLast30d: number;
}

export interface PatientsPerDoctor {
  doctorId: string;
  name: string;
  count: number;
  specialization: string | null;
  hospital: string | null;
}

export interface PatientTrendPoint {
  date: string;
  count: number;
}

export interface ConditionDistribution {
  condition: string;
  count: number;
}

export interface GenderCount {
  gender: string;
  count: number;
}

export interface AgeGroupCount {
  ageGroup: string;
  count: number;
}

export interface SpecialtyStats {
  specialization: string;
  doctors: number;
  patients: number;
}

export interface HospitalStats {
  hospital: string;
  doctors: number;
  patients: number;
}

export interface RecentAdmission {
  _id: string;
  name: string;
  age: number;
  gender: string;
  condition: string;
  admittedAt: Date;
  doctorId: string | null;
  doctorName: string | null;
  doctorSpecialization: string | null;
}

export class DashboardService {
  /**
   * Aggregate total counts and average patient load per doctor.
   * Now also includes admission trend counts (last 30d vs previous 30d)
   * and new doctor registrations in the last 30 days.
   * All 5 counts run in parallel via Promise.all for throughput.
   */
  static async getSummary(): Promise<DashboardSummary> {
    const now = new Date();
    const last30Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prev30Start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      totalDoctors,
      totalPatients,
      admissionsLast30d,
      admissionsPrev30d,
      newDoctorsLast30d,
    ] = await Promise.all([
      Doctor.countDocuments(),
      Patient.countDocuments(),
      // Patients admitted in the last 30 days (backed by idx_patients_admittedAt)
      Patient.countDocuments({ admittedAt: { $gte: last30Start } }),
      // Patients admitted in the previous 30-day window (60d–30d ago)
      Patient.countDocuments({
        admittedAt: { $gte: prev30Start, $lt: last30Start },
      }),
      // Doctors created in the last 30 days
      Doctor.countDocuments({ createdAt: { $gte: last30Start } }),
    ]);

    const avgPatientsPerDoctor =
      totalDoctors > 0 ? Number((totalPatients / totalDoctors).toFixed(2)) : 0;

    return {
      totalDoctors,
      totalPatients,
      avgPatientsPerDoctor,
      admissionsLast30d,
      admissionsPrev30d,
      newDoctorsLast30d,
    };
  }

  /**
   * Top 10 doctors ranked by total patient count.
   * Groups by doctorId first to minimize data before the $lookup join,
   * then limits to top 10 to avoid loading the full roster into memory.
   * Preserves patients whose doctor reference is missing (dangling refs)
   * instead of dropping them, so workload counts remain accurate.
   * Now also projects specialization and hospital from the joined doctor doc.
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
      // Left outer join to doctor collection to retrieve doctor's full name,
      // specialization and hospital.
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
      // Also project specialization and hospital from joined doctor document.
      {
        $project: {
          doctorId: { $toString: "$_id" },
          name: { $ifNull: ["$doctor.name", "Unknown Doctor"] },
          count: 1,
          specialization: { $ifNull: ["$doctor.specialization", null] },
          hospital: { $ifNull: ["$doctor.hospital", null] },
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

  /**
   * Aggregate patient counts broken down by gender.
   * NOTE: No dedicated index on the gender field alone; this performs a
   * collection scan. Acceptable at typical dataset sizes; add a sparse index
   * on gender if this becomes a hot path at scale.
   */
  static async getGender(): Promise<GenderCount[]> {
    const results = await Patient.aggregate<GenderCount>([
      // Stage 1: Group by gender field and count occurrences
      {
        $group: {
          _id: "$gender",
          count: { $sum: 1 },
        },
      },
      // Stage 2: Sort descending by count so the most common gender is first
      {
        $sort: { count: -1 },
      },
      // Stage 3: Project clean response shape
      {
        $project: {
          gender: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    return results;
  }

  /**
   * Aggregate patient distribution across predefined age buckets.
   * Uses MongoDB $bucket for server-side range classification.
   * Boundaries: 0-17, 18-34, 35-49, 50-64, 65+
   */
  static async getAgeGroups(): Promise<AgeGroupCount[]> {
    const results = await Patient.aggregate<AgeGroupCount>([
      // Stage 1: Bucket patients by age into predefined ranges.
      // $bucket boundaries are lower-inclusive: [0,18), [18,35), [35,50), [50,65), [65,200)
      // The "other" default captures any age outside 0–199 (e.g. null/missing).
      {
        $bucket: {
          groupBy: "$age",
          boundaries: [0, 18, 35, 50, 65, 200],
          default: "other",
          output: {
            count: { $sum: 1 },
          },
        },
      },
      // Stage 2: Map numeric lower-bound _id to readable label string
      {
        $project: {
          ageGroup: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", 0] }, then: "0-17" },
                { case: { $eq: ["$_id", 18] }, then: "18-34" },
                { case: { $eq: ["$_id", 35] }, then: "35-49" },
                { case: { $eq: ["$_id", 50] }, then: "50-64" },
                { case: { $eq: ["$_id", 65] }, then: "65+" },
              ],
              default: "other",
            },
          },
          count: 1,
          _id: 0,
        },
      },
    ]);

    return results.filter((r) => r.count > 0);
  }

  /**
   * Top 8 medical specializations ranked by number of doctors.
   * Uses a sub-pipeline $lookup to count patients per specialization
   * without loading full patient documents into memory.
   */
  static async getSpecialties(): Promise<SpecialtyStats[]> {
    const results = await Doctor.aggregate<SpecialtyStats>([
      // Stage 1: Group doctors by specialization, count them, and collect their IDs
      // for the subsequent patient lookup.
      {
        $group: {
          _id: "$specialization",
          doctors: { $sum: 1 },
          doctorIds: { $push: "$_id" },
        },
      },
      // Stage 2: Sort descending by doctor count before limiting.
      {
        $sort: { doctors: -1 },
      },
      // Stage 3: Keep only top 8 specializations.
      {
        $limit: 8,
      },
      // Stage 4: Sub-pipeline lookup counts patients whose doctorId is in this
      // specialization's doctor ID list. Using $count in the pipeline avoids
      // pulling full patient documents into the aggregation memory.
      {
        $lookup: {
          from: "patients",
          let: { ids: "$doctorIds" },
          pipeline: [
            { $match: { $expr: { $in: ["$doctorId", "$$ids"] } } },
            { $count: "count" },
          ],
          as: "patientDocs",
        },
      },
      // Stage 5: Project clean output shape.
      {
        $project: {
          specialization: "$_id",
          doctors: 1,
          patients: {
            $ifNull: [{ $arrayElemAt: ["$patientDocs.count", 0] }, 0],
          },
          _id: 0,
        },
      },
    ]);

    return results;
  }

  /**
   * Top 5 hospitals ranked by number of doctors.
   * Same approach as getSpecialties but grouped by hospital field.
   */
  static async getHospitals(): Promise<HospitalStats[]> {
    const results = await Doctor.aggregate<HospitalStats>([
      // Stage 1: Group doctors by hospital, count them, and collect their IDs.
      {
        $group: {
          _id: "$hospital",
          doctors: { $sum: 1 },
          doctorIds: { $push: "$_id" },
        },
      },
      // Stage 2: Sort descending by doctor count before limiting.
      {
        $sort: { doctors: -1 },
      },
      // Stage 3: Keep only top 5 hospitals.
      {
        $limit: 5,
      },
      // Stage 4: Sub-pipeline lookup counts patients for this hospital's doctors.
      {
        $lookup: {
          from: "patients",
          let: { ids: "$doctorIds" },
          pipeline: [
            { $match: { $expr: { $in: ["$doctorId", "$$ids"] } } },
            { $count: "count" },
          ],
          as: "patientDocs",
        },
      },
      // Stage 5: Project clean output shape.
      {
        $project: {
          hospital: "$_id",
          doctors: 1,
          patients: {
            $ifNull: [{ $arrayElemAt: ["$patientDocs.count", 0] }, 0],
          },
          _id: 0,
        },
      },
    ]);

    return results;
  }

  /**
   * Most recently admitted patients with joined doctor details.
   * $sort → $limit → $lookup ordering ensures the index is used for the
   * initial sort (idx_patients_admittedAt) and the lookup is performed
   * only on the small result set after limiting.
   *
   * @param limit - Number of records to return (1–20, default 8)
   */
  static async getRecentAdmissions(limit: number): Promise<RecentAdmission[]> {
    const results = await Patient.aggregate<RecentAdmission>([
      // Stage 1: Sort by admittedAt descending — uses idx_patients_admittedAt index.
      {
        $sort: { admittedAt: -1 },
      },
      // Stage 2: Limit BEFORE lookup to ensure index is leveraged for the top-N
      // and the join is only performed on the bounded result set.
      {
        $limit: limit,
      },
      // Stage 3: Left outer join to doctors collection for name and specialization.
      {
        $lookup: {
          from: "doctors",
          localField: "doctorId",
          foreignField: "_id",
          as: "doctor",
        },
      },
      // Stage 4: Unwind joined array; preserveNullAndEmptyArrays retains patients
      // with no assigned doctor (e.g. deleted doctor records).
      {
        $unwind: {
          path: "$doctor",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Stage 5: Project final shape including doctor details.
      {
        $project: {
          _id: { $toString: "$_id" },
          name: 1,
          age: 1,
          gender: 1,
          condition: 1,
          admittedAt: 1,
          doctorId: { $ifNull: [{ $toString: "$doctorId" }, null] },
          doctorName: { $ifNull: ["$doctor.name", null] },
          doctorSpecialization: {
            $ifNull: ["$doctor.specialization", null],
          },
        },
      },
    ]);

    return results;
  }
}
