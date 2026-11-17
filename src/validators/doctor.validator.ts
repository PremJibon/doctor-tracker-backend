import { z } from "zod";
import { isValidObjectId } from "mongoose";

const objectIdSchema = z
  .string()
  .refine((val) => isValidObjectId(val), { message: "Invalid MongoDB ObjectId" });

export const doctorIdParamSchema = z
  .object({
    id: objectIdSchema,
  })
  .strict();

export const doctorPatientParamSchema = z
  .object({
    id: objectIdSchema,
    patientId: objectIdSchema,
  })
  .strict();

export const createDoctorSchema = z
  .object({
    name: z.string({ required_error: "Doctor name is required" }).min(2, "Name must be at least 2 characters").trim(),
    specialization: z.string({ required_error: "Specialization is required" }).min(2).trim(),
    hospital: z.string({ required_error: "Hospital is required" }).min(2).trim(),
    phone: z.string({ required_error: "Phone is required" }).min(5).trim(),
    email: z.string({ required_error: "Email is required" }).email("Invalid email format").trim().toLowerCase(),
  })
  .strict();

export const doctorQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().trim().optional(),
    specialization: z.string().trim().optional(),
    hospital: z.string().trim().optional(),
    from: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    to: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    sort: z.enum(["createdAt:desc", "createdAt:asc", "name:asc", "name:desc"]).optional().default("createdAt:desc"),
  })
  .strict();

export const createDoctorPatientSchema = z
  .object({
    name: z.string({ required_error: "Patient name is required" }).min(2).trim(),
    age: z.coerce.number().int().min(0, "Age cannot be negative"),
    gender: z.enum(["Male", "Female", "Other", "male", "female", "other"]),
    phone: z.string({ required_error: "Phone number is required" }).min(5).trim(),
    condition: z.string({ required_error: "Medical condition is required" }).min(2).trim(),
    admittedAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  })
  .strict();

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type DoctorQueryInput = z.infer<typeof doctorQuerySchema>;
export type CreateDoctorPatientInput = z.infer<typeof createDoctorPatientSchema>;
