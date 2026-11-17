import { Request, Response } from "express";
import { DashboardService } from "../services/dashboard.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { DashboardOverTimeQuery } from "../validators/dashboard.validator.js";

export const getSummary = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await DashboardService.getSummary();
  res.status(200).json(summary);
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
