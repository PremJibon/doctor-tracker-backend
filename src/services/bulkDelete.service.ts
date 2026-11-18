import mongoose, { Types } from "mongoose";
import { Doctor, IDoctorDocument } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { BulkDeleteDoctorsInput, BulkDeletePatientsInput } from "../validators/bulkDelete.validator.js";

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------

export interface BulkDeletePatientsResult {
  requested: number;
  deleted: number;
  notFound: string[];
}

/**
 * Bulk-delete patients by id list.
 * - Deduplicates ids before processing.
 * - Single deleteMany call (no loop) for atomicity and performance.
 * - Derives notFound by comparing the requested set against what was actually deleted.
 */
export async function bulkDeletePatients(
  input: BulkDeletePatientsInput
): Promise<BulkDeletePatientsResult> {
  // 1. Dedup
  const uniqueIds = [...new Set(input.ids)];
  const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));

  // 2. Fetch only _id fields for the matching documents so we can compute notFound cheaply
  const found = await Patient.find({ _id: { $in: objectIds } })
    .select("_id")
    .lean<{ _id: Types.ObjectId }[]>();

  const foundSet = new Set(found.map((doc) => doc._id.toString()));
  const notFound = uniqueIds.filter((id) => !foundSet.has(id));

  // 3. Single deleteMany — one round-trip, index-backed
  const { deletedCount } = await Patient.deleteMany({ _id: { $in: objectIds } });

  return {
    requested: uniqueIds.length,
    deleted: deletedCount ?? 0,
    notFound,
  };
}

// ---------------------------------------------------------------------------
// Doctors
// ---------------------------------------------------------------------------

export interface DoctorSkippedEntry {
  id: string;
  name: string;
  reason: "HAS_PATIENTS";
  patientCount: number;
}

export interface BulkDeleteDoctorsResult {
  requested: number;
  deleted: number;
  deletedPatients: number;
  skipped: DoctorSkippedEntry[];
  notFound: string[];
}

/**
 * Bulk-delete doctors, with optional cascade to their patients.
 *
 * Transaction strategy:
 *   - Attempt a MongoDB multi-document transaction via mongoose session.
 *   - Some deployments (e.g. MongoDB Atlas free-tier M0, standalone nodes) do not
 *     support multi-document transactions and will throw an error containing
 *     "Transaction numbers are only allowed on a replica set member or mongos".
 *   - When that specific error is detected the service falls back to sequential
 *     deleteMany calls (patients first, then doctors). Patients are deleted first
 *     so that if the subsequent doctor delete were to fail, no patients would be
 *     orphaned and the operation can be safely retried.
 */
export async function bulkDeleteDoctors(
  input: BulkDeleteDoctorsInput
): Promise<BulkDeleteDoctorsResult> {
  const { cascade } = input;

  // 1. Dedup
  const uniqueIds = [...new Set(input.ids)];
  const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));

  // 2. Fetch found doctors (project only the fields we need)
  const foundDoctors = await Doctor.find({ _id: { $in: objectIds } })
    .select("_id name")
    .lean<Pick<IDoctorDocument, "_id" | "name">[]>();

  const foundMap = new Map(foundDoctors.map((d) => [d._id.toString(), d]));

  // 3. Compute notFound
  const notFound = uniqueIds.filter((id) => !foundMap.has(id));

  // 4. For each found doctor, check patient count
  const foundDoctorIds = foundDoctors.map((d) => d._id as Types.ObjectId);

  const patientCounts = await Patient.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { doctorId: { $in: foundDoctorIds } } },
    { $group: { _id: "$doctorId", count: { $sum: 1 } } },
  ]);

  const countMap = new Map(patientCounts.map((pc) => [pc._id.toString(), pc.count]));

  // 5. Classify doctors into: toDelete (zero patients or cascade=true) vs skipped
  const toDeleteDoctors: Types.ObjectId[] = [];
  const toDeletePatientDoctorIds: Types.ObjectId[] = []; // cascade patient deletes
  const skipped: DoctorSkippedEntry[] = [];

  for (const doctor of foundDoctors) {
    const doctorIdStr = doctor._id.toString();
    const patientCount = countMap.get(doctorIdStr) ?? 0;

    if (patientCount === 0) {
      // Always delete doctors with no patients
      toDeleteDoctors.push(doctor._id as Types.ObjectId);
    } else if (cascade) {
      // cascade=true: delete patients then doctor
      toDeleteDoctors.push(doctor._id as Types.ObjectId);
      toDeletePatientDoctorIds.push(doctor._id as Types.ObjectId);
    } else {
      // cascade=false and has patients: skip
      skipped.push({
        id: doctorIdStr,
        name: doctor.name,
        reason: "HAS_PATIENTS",
        patientCount,
      });
    }
  }

  // 6. Execute deletes
  let deletedPatients = 0;
  let deletedDoctors = 0;

  if (toDeleteDoctors.length > 0) {
    if (toDeletePatientDoctorIds.length > 0) {
      // Attempt a transaction for the cascade path; fall back if unsupported
      const session = await mongoose.connection.startSession();
      try {
        session.startTransaction();

        // Patients deleted first → safe retry semantics (no orphan patients if doctor delete fails)
        const patientResult = await Patient.deleteMany(
          { doctorId: { $in: toDeletePatientDoctorIds } },
          { session }
        );
        const doctorResult = await Doctor.deleteMany(
          { _id: { $in: toDeleteDoctors } },
          { session }
        );

        await session.commitTransaction();

        deletedPatients = patientResult.deletedCount ?? 0;
        deletedDoctors = doctorResult.deletedCount ?? 0;
      } catch (err: unknown) {
        await session.abortTransaction();

        // Detect replica-set / standalone transaction unsupported error.
        // Fallback: sequential deleteMany without a session.
        // Safety rationale: patients are deleted first so that if the doctor
        // deleteMany subsequently fails, no patient records are left orphaned.
        if (
          err instanceof Error &&
          (err.message.includes("Transaction") ||
            err.message.includes("transaction") ||
            err.message.includes("replica set"))
        ) {
          const patientResult = await Patient.deleteMany({
            doctorId: { $in: toDeletePatientDoctorIds },
          });
          const doctorResult = await Doctor.deleteMany({ _id: { $in: toDeleteDoctors } });

          deletedPatients = patientResult.deletedCount ?? 0;
          deletedDoctors = doctorResult.deletedCount ?? 0;
        } else {
          throw err;
        }
      } finally {
        await session.endSession();
      }
    } else {
      // No patients to cascade-delete; plain deleteMany for doctors
      const doctorResult = await Doctor.deleteMany({ _id: { $in: toDeleteDoctors } });
      deletedDoctors = doctorResult.deletedCount ?? 0;
    }
  }

  return {
    requested: uniqueIds.length,
    deleted: deletedDoctors,
    deletedPatients,
    skipped,
    notFound,
  };
}
