import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import {
  listPatientsQuerySchema,
  updatePatientSchema,
  patientIdParamsSchema,
} from "../validators/patient.validator.js";
import { listPatients, updatePatient, deletePatient } from "../controllers/patient.controller.js";

const router = Router();

router.use(requireAuth);

// GET /api/patients
router.get("/", validate({ query: listPatientsQuerySchema }), listPatients);

// PATCH /api/patients/:id
router.patch(
  "/:id",
  validate({ params: patientIdParamsSchema, body: updatePatientSchema }),
  updatePatient
);

// DELETE /api/patients/:id
router.delete(
  "/:id",
  validate({ params: patientIdParamsSchema }),
  deletePatient
);

export default router;
