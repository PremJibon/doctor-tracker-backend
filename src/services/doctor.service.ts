import { FilterQuery, SortOrder } from "mongoose";
import { Doctor, IDoctorDocument } from "../models/Doctor.js";
import { Patient, IPatientDocument } from "../models/Patient.js";
import { ApiError } from "../utils/ApiError.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { formatPaginatedResponse, PaginatedResult } from "../utils/pagination.js";
import {
  CreateDoctorInput,
  DoctorQueryInput,
  CreateDoctorPatientInput,
} from "../validators/doctor.validator.js";

export class DoctorService {
  /**
   * Create a new doctor profile.
   */
  static async createDoctor(input: CreateDoctorInput): Promise<IDoctorDocument> {
    const existing = await Doctor.findOne({ email: input.email }).lean();
    if (existing) {
      throw ApiError.conflict("A doctor with this email address already exists.", "DOCTOR_EXISTS");
    }

    const doctor = await Doctor.create(input);
    return doctor;
  }

  /**
   * Retrieve a paginated, filtered, and searched list of doctors.
   * Utilizes anchored regex on nameLower and compound indexes to guarantee IXSCAN execution.
   */
  static async getDoctors(query: DoctorQueryInput): Promise<PaginatedResult<IDoctorDocument>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IDoctorDocument> = {};

    // 1. Anchored prefix search on indexed lowercase name
    // Supports both direct prefix and title-prefixed prefix (e.g. "Rafiqul" matching "Dr. Rafiqul")
    if (query.search) {
      const term = escapeRegex(query.search.toLowerCase());
      if (!term.startsWith("dr")) {
        filter.$or = [
          { nameLower: { $regex: `^${term}` } },
          { nameLower: { $regex: `^dr\\.?\\s*${term}` } },
        ];
      } else {
        filter.nameLower = { $regex: `^${term}` };
      }
    }

    // 2. Specialty filtering
    if (query.specialization) {
      filter.specialization = query.specialization;
    }

    // 3. Hospital filtering
    if (query.hospital) {
      filter.hospital = query.hospital;
    }

    // 4. Date range filtering on createdAt
    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) {
        filter.createdAt.$gte = new Date(query.from);
      }
      if (query.to) {
        // If date-only string (YYYY-MM-DD), set to end of that day
        const toDate = new Date(query.to);
        if (query.to.length === 10) {
          toDate.setUTCHours(23, 59, 59, 999);
        }
        filter.createdAt.$lte = toDate;
      }
    }

    // 5. Sorting
    const sortOptions: { [key: string]: SortOrder } = {};
    if (query.sort === "createdAt:asc") {
      sortOptions.createdAt = 1;
    } else if (query.sort === "name:asc") {
      sortOptions.nameLower = 1;
    } else if (query.sort === "name:desc") {
      sortOptions.nameLower = -1;
    } else {
      // Default: createdAt:desc
      sortOptions.createdAt = -1;
    }

    // Parallel count and fetch for maximum throughput
    const [doctors, total] = await Promise.all([
      Doctor.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select("-nameLower")
        .lean<IDoctorDocument[]>(),
      Doctor.countDocuments(filter),
    ]);

    return formatPaginatedResponse(doctors, total, page, limit);
  }

  /**
   * Fetch single doctor profile by ObjectId.
   */
  static async getDoctorById(id: string): Promise<IDoctorDocument> {
    const doctor = await Doctor.findById(id).select("-nameLower").lean<IDoctorDocument>();
    if (!doctor) {
      throw ApiError.notFound("Doctor not found", "DOCTOR_NOT_FOUND");
    }
    return doctor;
  }

  /**
   * Fetch paginated patient roster assigned to a specific doctor.
   */
  static async getDoctorPatients(
    doctorId: string,
    query: { page?: number; limit?: number; search?: string }
  ): Promise<PaginatedResult<IPatientDocument>> {
    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) {
      throw ApiError.notFound("Doctor not found", "DOCTOR_NOT_FOUND");
    }

    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IPatientDocument> = { doctorId };

    if (query.search) {
      filter.nameLower = { $regex: `^${escapeRegex(query.search.toLowerCase())}` };
    }

    const [patients, total] = await Promise.all([
      Patient.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-nameLower")
        .lean<IPatientDocument[]>(),
      Patient.countDocuments(filter),
    ]);

    return formatPaginatedResponse(patients, total, page, limit);
  }

  /**
   * Add a new patient assigned to a specific doctor.
   */
  static async addPatientToDoctor(
    doctorId: string,
    input: CreateDoctorPatientInput
  ): Promise<IPatientDocument> {
    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) {
      throw ApiError.notFound("Doctor not found", "DOCTOR_NOT_FOUND");
    }

    const patient = await Patient.create({
      ...input,
      doctorId,
      admittedAt: input.admittedAt ? new Date(input.admittedAt) : new Date(),
    });

    return patient;
  }

  /**
   * Delete a patient from a specific doctor's roster with relationship verification.
   */
  static async deletePatientFromDoctor(doctorId: string, patientId: string): Promise<void> {
    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) {
      throw ApiError.notFound("Doctor not found", "DOCTOR_NOT_FOUND");
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw ApiError.notFound("Patient not found", "PATIENT_NOT_FOUND");
    }

    if (patient.doctorId.toString() !== doctorId) {
      throw ApiError.badRequest(
        "Patient is not assigned to this doctor",
        "PATIENT_DOCTOR_MISMATCH"
      );
    }

    await Patient.findByIdAndDelete(patientId);
  }
}
