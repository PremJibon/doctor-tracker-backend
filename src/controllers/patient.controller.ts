import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { PatientService } from "../services/patient.service.js";
import { ListPatientsQuery, UpdatePatientInput, PatientIdParams } from "../validators/patient.validator.js";

export const listPatients = asyncHandler(async (req: Request, res: Response) => {
  const result = await PatientService.listPatients(req.query as unknown as ListPatientsQuery);
  res.status(200).json(result);
});

export const updatePatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as PatientIdParams;
  const patient = await PatientService.updatePatient(id, req.body as UpdatePatientInput);
  res.status(200).json({ data: patient });
});

export const deletePatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as PatientIdParams;
  await PatientService.deletePatient(id);
  res.status(200).json({ message: "Patient deleted successfully" });
});
