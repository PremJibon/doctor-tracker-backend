import { z } from "zod";
import { isValidObjectId } from "mongoose";

const objectIdSchema = z.string().refine((val) => isValidObjectId(val), {
  message: "Invalid MongoDB ObjectId",
});

export const bulkDeletePatientsSchema = z
  .object({
    ids: z
      .array(objectIdSchema)
      .min(1, "At least one id is required")
      .max(100, "Cannot delete more than 100 records at once"),
  })
  .strict();

export const bulkDeleteDoctorsSchema = z
  .object({
    ids: z
      .array(objectIdSchema)
      .min(1, "At least one id is required")
      .max(100, "Cannot delete more than 100 records at once"),
    cascade: z.boolean().default(false),
  })
  .strict();

export type BulkDeletePatientsInput = z.infer<typeof bulkDeletePatientsSchema>;
export type BulkDeleteDoctorsInput = z.infer<typeof bulkDeleteDoctorsSchema>;
