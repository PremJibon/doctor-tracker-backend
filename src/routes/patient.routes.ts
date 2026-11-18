import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import {
  listPatientsQuerySchema,
  updatePatientSchema,
  patientIdParamsSchema,
} from "../validators/patient.validator.js";
import { listPatients, updatePatient, deletePatient } from "../controllers/patient.controller.js";
import { bulkDeletePatientsSchema } from "../validators/bulkDelete.validator.js";
import { bulkDeletePatientsController } from "../controllers/bulkDelete.controller.js";

const router = Router();

router.use(requireAuth);

// GET /api/patients
router.get("/", validate({ query: listPatientsQuerySchema }), listPatients);

// POST /api/patients/bulk-delete
// Must be registered BEFORE /:id to prevent Express treating "bulk-delete" as an ObjectId param.
router.post(
  "/bulk-delete",
  validate({ body: bulkDeletePatientsSchema }),
  bulkDeletePatientsController
);

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
