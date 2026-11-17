import { FilterQuery, Types } from "mongoose";
import { Patient, IPatientDocument } from "../models/Patient.js";
import { Doctor } from "../models/Doctor.js";
import { ApiError } from "../utils/ApiError.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { getPagination, formatPaginatedResponse, PaginatedResult } from "../utils/pagination.js";
import { ListPatientsQuery, UpdatePatientInput } from "../validators/patient.validator.js";

const PATIENT_PROJECTION = { nameLower: 0 } as const;

export class PatientService {
  /**
   * List all patients with optional prefix search, filters, sort, and pagination.
   * Uses indexed fields to guarantee IXSCAN on every query path.
   */
  static async listPatients(query: ListPatientsQuery): Promise<PaginatedResult<IPatientDocument>> {
    const { page, limit, search, condition, doctorId, from, to, sort } = query;
    const { skip } = getPagination({ page, limit });

    const filter: FilterQuery<IPatientDocument> = {};

    if (search) {
      // Anchored prefix regex on nameLower index - ensures IXSCAN
      filter.nameLower = { $regex: `^${escapeRegex(search.toLowerCase())}` };
    }

    if (condition) {
      filter.condition = condition;
    }

    if (doctorId) {
      if (!Types.ObjectId.isValid(doctorId)) {
        throw ApiError.badRequest("Invalid doctorId format", "INVALID_DOCTOR_ID");
      }
      filter.doctorId = new Types.ObjectId(doctorId);
    }

    if (from || to) {
      filter.admittedAt = {} as Record<string, Date>;
      if (from) (filter.admittedAt as Record<string, Date>).$gte = new Date(from);
      if (to) (filter.admittedAt as Record<string, Date>).$lte = new Date(to);
    }

    // Build sort
    const [sortField, sortDir] = (sort ?? "createdAt:desc").split(":");
    const sortKey = sortField === "name" ? "nameLower" : (sortField ?? "createdAt");
    const sortObj: Record<string, 1 | -1> = {
      [sortKey]: sortDir === "asc" ? 1 : -1,
    };

    const [total, data] = await Promise.all([
      Patient.countDocuments(filter),
      Patient.find(filter)
        .select(PATIENT_PROJECTION)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean<IPatientDocument[]>(),
    ]);

    return formatPaginatedResponse(data, total, page, limit);
  }

  /**
   * Update a patient record by ID.
   * If name changes, nameLower is automatically synced via schema setter.
   */
  static async updatePatient(id: string, input: UpdatePatientInput): Promise<IPatientDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("Patient not found", "PATIENT_NOT_FOUND");
    }

    if (input.doctorId) {
      if (!Types.ObjectId.isValid(input.doctorId)) {
        throw ApiError.badRequest("Invalid doctorId format", "INVALID_DOCTOR_ID");
      }
      const doctorExists = await Doctor.exists({ _id: input.doctorId });
      if (!doctorExists) {
        throw ApiError.notFound("Doctor not found", "DOCTOR_NOT_FOUND");
      }
    }

    // Build update: if name changes, sync nameLower
    const updateData: Partial<IPatientDocument> & { nameLower?: string } = { ...input } as Partial<IPatientDocument>;
    if (input.name) {
      updateData.nameLower = input.name.toLowerCase().trim();
    }
    if (input.admittedAt) {
      (updateData as Record<string, unknown>).admittedAt = new Date(input.admittedAt);
    }
    if (input.doctorId) {
      (updateData as Record<string, unknown>).doctorId = new Types.ObjectId(input.doctorId);
    }

    const patient = await Patient.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true, projection: PATIENT_PROJECTION }
    ).lean<IPatientDocument>();

    if (!patient) {
      throw ApiError.notFound("Patient not found", "PATIENT_NOT_FOUND");
    }

    return patient;
  }

  /**
   * Delete a patient by ID.
   */
  static async deletePatient(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("Patient not found", "PATIENT_NOT_FOUND");
    }

    const patient = await Patient.findByIdAndDelete(id);
    if (!patient) {
      throw ApiError.notFound("Patient not found", "PATIENT_NOT_FOUND");
    }
  }
}
