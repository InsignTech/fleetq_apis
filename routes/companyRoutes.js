import express from "express";
import {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
} from "../controller/companyController.js";
import protect from "../middleWare/userMiddleWare.js";
import { checkAdmin } from "../middleWare/checkAdmin.js";

const router = express.Router();

router.get("/", getCompanies);
router.get("/:id", getCompanyById);

// Admin-only routes
router.post("/", protect, checkAdmin, createCompany);
router.put("/:id", protect, checkAdmin, updateCompany);
router.delete("/:id", protect, checkAdmin, deleteCompany);

export default router;
