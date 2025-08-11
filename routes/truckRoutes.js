import express from "express";
import {
  createTruck,
  getTrucks,
  getTruckById,
  updateTruck,
  deleteTruck,
} from "../controller/truckController.js";
import protect from "../middleWare/userMiddleWare.js";
import { checkAdmin } from "../middleWare/checkAdmin.js";

const router = express.Router();

// Create a truck
router.post("/", protect, checkAdmin, createTruck);

// Get all trucks
router.get("/", getTrucks);

// Get single truck by ID
router.get("/:id", getTruckById);

// Update a truck
router.put("/:id", protect, checkAdmin, updateTruck);

// Delete a truck
router.delete("/:id", protect, checkAdmin, deleteTruck);

export default router;
