import { Router } from "express";
import { login, refresh, logout, me } from "../controllers/auth.controller.js";
import { loginRateLimiter } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { loginSchema } from "../validators/auth.validator.js";

const router = Router();

router.post("/login", loginRateLimiter, validate({ body: loginSchema }), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
