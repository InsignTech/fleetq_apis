import express from "express";
import {
  createAllocation,
  getAllocations,
  getAllocationById,
  updateAllocation,
  allocateTrucksToTrips,
} from "../controller/allocationController.js";

const router = express.Router();

// Create a new allocation
router.post("/", createAllocation);

// Get all allocations with optional filters
router.get("/", getAllocations);

// Get a single allocation by ID
router.get("/:id", getAllocationById);

// Update allocation by ID
router.put("/:id", updateAllocation);

//allocate trucks
router.get('/allocate', allocateTrucksToTrips)

export default router;
