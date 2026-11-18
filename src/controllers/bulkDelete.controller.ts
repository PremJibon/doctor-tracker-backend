import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { bulkDeletePatients, bulkDeleteDoctors } from "../services/bulkDelete.service.js";
import {
  BulkDeletePatientsInput,
  BulkDeleteDoctorsInput,
} from "../validators/bulkDelete.validator.js";

/**
 * POST /api/patients/bulk-delete
 * Thin controller — delegates all logic to bulkDelete.service.
 */
export const bulkDeletePatientsController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await bulkDeletePatients(req.body as BulkDeletePatientsInput);
    res.status(200).json({ data: result });
  }
);

/**
 * POST /api/doctors/bulk-delete
 * Thin controller — delegates all logic to bulkDelete.service.
 */
export const bulkDeleteDoctorsController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await bulkDeleteDoctors(req.body as BulkDeleteDoctorsInput);
    res.status(200).json({ data: result });
  }
);
