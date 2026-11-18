import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import {
  createDoctorSchema,
  doctorQuerySchema,
  doctorIdParamSchema,
  doctorPatientParamSchema,
  createDoctorPatientSchema,
} from "../validators/doctor.validator.js";
import {
  createDoctor,
  getDoctors,
  getDoctorById,
  getDoctorPatients,
  addDoctorPatient,
  deleteDoctorPatient,
} from "../controllers/doctor.controller.js";
import { bulkDeleteDoctorsSchema } from "../validators/bulkDelete.validator.js";
import { bulkDeleteDoctorsController } from "../controllers/bulkDelete.controller.js";

const router = Router();

// All doctor routes are protected by admin authentication
router.use(requireAuth);

// POST /api/doctors
router.post("/", validate({ body: createDoctorSchema }), createDoctor);

// GET /api/doctors
router.get("/", validate({ query: doctorQuerySchema }), getDoctors);

// POST /api/doctors/bulk-delete
// Must be registered BEFORE /:id to prevent Express treating "bulk-delete" as an ObjectId param.
router.post(
  "/bulk-delete",
  validate({ body: bulkDeleteDoctorsSchema }),
  bulkDeleteDoctorsController
);

// GET /api/doctors/:id
router.get("/:id", validate({ params: doctorIdParamSchema }), getDoctorById);

// GET /api/doctors/:id/patients
router.get("/:id/patients", validate({ params: doctorIdParamSchema }), getDoctorPatients);

// POST /api/doctors/:id/patients
router.post(
  "/:id/patients",
  validate({ params: doctorIdParamSchema, body: createDoctorPatientSchema }),
  addDoctorPatient
);

// DELETE /api/doctors/:id/patients/:patientId
router.delete(
  "/:id/patients/:patientId",
  validate({ params: doctorPatientParamSchema }),
  deleteDoctorPatient
);

export default router;
