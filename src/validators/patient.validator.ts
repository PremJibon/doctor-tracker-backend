import { z } from "zod";

// --- List Patients Query ---
export const listPatientsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().trim().optional(),
    condition: z.string().trim().optional(),
    doctorId: z.string().trim().optional(),
    from: z.string().trim().optional(),
    to: z.string().trim().optional(),
    sort: z
      .enum(["createdAt:asc", "createdAt:desc", "admittedAt:asc", "admittedAt:desc", "name:asc", "name:desc"])
      .optional()
      .default("createdAt:desc"),
  })
  .strict();

export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;

// --- Update Patient Body ---
export const updatePatientSchema = z
  .object({
    name: z.string().min(2).trim().optional(),
    age: z.coerce.number().int().min(0).max(150).optional(),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
    phone: z.string().min(5).trim().optional(),
    condition: z.string().min(2).trim().optional(),
    doctorId: z.string().trim().optional(),
    admittedAt: z.string().trim().optional(),
  })
  .strict();

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

// --- Patient ID Params ---
export const patientIdParamsSchema = z
  .object({
    id: z.string().min(1, "Patient ID is required"),
  })
  .strict();

export type PatientIdParams = z.infer<typeof patientIdParamsSchema>;
