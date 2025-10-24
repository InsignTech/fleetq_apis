import express from "express";
import {
  createLocation,
  getLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
  getLocationsPDF,
  getLocationDetails,
  getLocationsWithRate,
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

router.post("/get-location-details",getLocationDetails)

router.get("/:id", getLocationById);

// Update location by ID
router.put("/:id", protect, checkAdmin, updateLocation);

// Delete location by ID
router.delete("/:id", protect, checkAdmin, deleteLocation);

router.get("/app/get-location-with-rate",getLocationsWithRate)
export default router;
