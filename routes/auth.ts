import { Router } from "express";
import { adminLogin } from "../controllers/auth";

const router = Router();

router.post("/admin-login", adminLogin);

export default router;
