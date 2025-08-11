import Allocation from "../models/allocationSchema.js";
import mongoose from "mongoose";
import { STATUS } from "../utils/constants/statusEnum.js";
import { sendResponse } from "../utils/responseHandler.js";

// Create allocation
export const createAllocation = async (req, res, next) => {
  try {
    const { tripBookingId, truckBookingId } = req.body;

    if (!tripBookingId || !truckBookingId) {
      return next({ statusCode: 400, message: "tripBookingId and truckBookingId are required" });
    }

    // Validate status, default to ALLOCATED if not provided
    const allocationStatus =  STATUS.ALLOCATED;
    if (![STATUS.ALLOCATED, STATUS.CANCELLED].includes(allocationStatus)) {
      return next({ statusCode: 400, message: `Invalid status. Allowed: ${STATUS.ALLOCATED}, ${STATUS.CANCELLED}` });
    }

    const allocation = await Allocation.create({
      tripBookingId,
      truckBookingId,
      status: allocationStatus,
      createdBy: req.user._id,
      allocatedOn: new Date(),
    });

    return sendResponse(res, 201, "Allocation created successfully", allocation);
  } catch (err) {
    next(err);
  }
};

// Get all allocations (optionally filtered by tripBookingId or truckBookingId)
export const getAllocations = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.tripBookingId && mongoose.Types.ObjectId.isValid(req.query.tripBookingId)) {
      filter.tripBookingId = req.query.tripBookingId;
    }
    if (req.query.truckBookingId && mongoose.Types.ObjectId.isValid(req.query.truckBookingId)) {
      filter.truckBookingId = req.query.truckBookingId;
    }
    if (req.query.status && [STATUS.ALLOCATED, STATUS.CANCELLED].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const allocations = await Allocation.find(filter).sort({ allocatedOn: -1 });

    return sendResponse(res, 200, "Allocations fetched successfully", allocations);
  } catch (err) {
    next(err);
  }
};

// Get allocation by ID
export const getAllocationById = async (req, res, next) => {
  try {
    const allocation = await Allocation.findById(req.params.id);

    if (!allocation) {
      return next({ statusCode: 404, message: "Allocation not found" });
    }

    return sendResponse(res, 200, "Allocation fetched successfully", allocation);
  } catch (err) {
    next(err);
  }
};

// Update allocation
export const updateAllocation = async (req, res, next) => {
  try {
    const id = req.params.id;
    const allowedUpdates = ["status"];
    const updateData = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        if (key === "status" && ![STATUS.ALLOCATED, STATUS.CANCELLED].includes(req.body[key])) {
          return next({ statusCode: 400, message: `Invalid status. Allowed: ${STATUS.ALLOCATED}, ${STATUS.CANCELLED}` });
        }
        updateData[key] = req.body[key];
      }
    }

    updateData.updatedBy = req.user._id;

    const updatedAllocation = await Allocation.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedAllocation) {
      return next({ statusCode: 404, message: "Allocation not found" });
    }

    return sendResponse(res, 200, "Allocation updated successfully", updatedAllocation);
  } catch (err) {
    next(err);
  }
};
