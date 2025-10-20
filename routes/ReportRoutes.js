import express from "express";
import {
  getReport
} from "../controller/reportController.js";
import protect from "../middleWare/userMiddleWare.js";
import { checkAdmin } from "../middleWare/checkAdmin.js";

const router = express.Router();

// Create a truck
router.post("/",  getReport);



export default router;
