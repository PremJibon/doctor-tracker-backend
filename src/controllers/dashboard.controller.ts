import { Request, Response } from "express";
import { DashboardService } from "../services/dashboard.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  DashboardOverTimeQuery,
  RecentAdmissionsQuery,
} from "../validators/dashboard.validator.js";

export const getSummary = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await DashboardService.getSummary();
  res.status(200).json({ data: summary });
});

export const getPatientsPerDoctor = asyncHandler(async (_req: Request, res: Response) => {
  const result = await DashboardService.getPatientsPerDoctor();
  res.status(200).json({ data: result });
});

export const getPatientsOverTime = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as DashboardOverTimeQuery;
  const result = await DashboardService.getPatientsOverTime(query.range);
  res.status(200).json({ data: result });
});

export const getConditions = asyncHandler(async (_req: Request, res: Response) => {
  const result = await DashboardService.getConditions();
  res.status(200).json({ data: result });
});

export const getGender = asyncHandler(async (_req: Request, res: Response) => {
  const result = await DashboardService.getGender();
  res.status(200).json({ data: result });
});

export const getAgeGroups = asyncHandler(async (_req: Request, res: Response) => {
  const result = await DashboardService.getAgeGroups();
  res.status(200).json({ data: result });
});

export const getSpecialties = asyncHandler(async (_req: Request, res: Response) => {
  const result = await DashboardService.getSpecialties();
  res.status(200).json({ data: result });
});

export const getHospitals = asyncHandler(async (_req: Request, res: Response) => {
  const result = await DashboardService.getHospitals();
  res.status(200).json({ data: result });
});

export const getRecentAdmissions = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as RecentAdmissionsQuery;
  const result = await DashboardService.getRecentAdmissions(query.limit);
  res.status(200).json({ data: result });
});
