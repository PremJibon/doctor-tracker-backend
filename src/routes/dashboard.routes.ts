import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { dashboardOverTimeQuerySchema } from "../validators/dashboard.validator.js";
import {
  getSummary,
  getPatientsPerDoctor,
  getPatientsOverTime,
  getConditions,
} from "../controllers/dashboard.controller.js";

const router = Router();

// All dashboard endpoints require admin authentication
router.use(requireAuth);

// GET /api/dashboard/summary
router.get("/summary", getSummary);

// GET /api/dashboard/patients-per-doctor
router.get("/patients-per-doctor", getPatientsPerDoctor);

// GET /api/dashboard/patients-over-time?range=7d|30d|12m
router.get(
  "/patients-over-time",
  validate({ query: dashboardOverTimeQuerySchema }),
  getPatientsOverTime
);

// GET /api/dashboard/conditions
router.get("/conditions", getConditions);

export default router;
