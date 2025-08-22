import express from "express";
import {
  createLocation,
  getLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
  getLocationsPDF,
} from "../controller/locationController.js";
import protect from "../middleWare/userMiddleWare.js";
import { checkAdmin } from "../middleWare/checkAdmin.js";

const router = express.Router();

// Create new location
router.post("/", protect, checkAdmin, createLocation);

// Get all locations
router.get("/", getLocations);

// Get single location by ID
router.get("/get-all-locations-pdf",getLocationsPDF)

router.get("/:id", getLocationById);

// Update location by ID
router.put("/:id", protect, checkAdmin, updateLocation);

// Delete location by ID
router.delete("/:id", protect, checkAdmin, deleteLocation);


export default router;
