import { Request, Response } from "express";
import { DoctorService } from "../services/doctor.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  CreateDoctorInput,
  DoctorQueryInput,
  CreateDoctorPatientInput,
} from "../validators/doctor.validator.js";

export const createDoctor = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await DoctorService.createDoctor(req.body as CreateDoctorInput);
  res.status(201).json({ data: doctor });
});

export const getDoctors = asyncHandler(async (req: Request, res: Response) => {
  const result = await DoctorService.getDoctors(req.query as unknown as DoctorQueryInput);
  res.status(200).json(result);
});

export const getDoctorById = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await DoctorService.getDoctorById(req.params.id);
  res.status(200).json({ data: doctor });
});

export const getDoctorPatients = asyncHandler(async (req: Request, res: Response) => {
  const result = await DoctorService.getDoctorPatients(
    req.params.id,
    req.query as { page?: number; limit?: number; search?: string }
  );
  res.status(200).json(result);
});

export const addDoctorPatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await DoctorService.addPatientToDoctor(
    req.params.id,
    req.body as CreateDoctorPatientInput
  );
  res.status(201).json({ data: patient });
});

export const deleteDoctorPatient = asyncHandler(async (req: Request, res: Response) => {
  await DoctorService.deletePatientFromDoctor(req.params.id, req.params.patientId);
  res.status(200).json({ message: "Patient removed from doctor's roster successfully" });
});
