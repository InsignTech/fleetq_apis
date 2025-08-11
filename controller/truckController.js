import Truck from "../models/truckSchema.js";
import { sendResponse } from "../utils/responseHandler.js";

// Create Truck
export const createTruck = async (req, res, next) => {
  try {
    const { registrationNumber, companyId, status, category, type } = req.body;

    const existTruck = await Truck.findOne({ registrationNumber: registrationNumber.toUpperCase() });
    if (existTruck) {
      const error = new Error("Truck with this registration number already exists");
      error.statusCode = 400;
      return next(error);
    }

    const newTruck = await Truck.create({
      registrationNumber,
      companyId,
      status,
      category,
      type,
      createdBy: req.user._id,
    });

    return sendResponse(res, 201, "Truck created successfully", newTruck);
  } catch (err) {
    next(err);
  }
};

// Get All Trucks
export const getTrucks = async (req, res, next) => {
  try {
    const trucks = await Truck.find().populate("companyId", "companyName").populate("createdBy", "userName");
    return sendResponse(res, 200, "Trucks fetched successfully", trucks);
  } catch (err) {
    next(err);
  }
};

// Get Single Truck
export const getTruckById = async (req, res, next) => {
  try {
    const truck = await Truck.findById(req.params.id)
      .populate("companyId", "companyName")
      .populate("createdBy", "userName");
    if (!truck) {
      const error = new Error("Truck not found");
      error.statusCode = 404;
      return next(error);
    }
    return sendResponse(res, 200, "Truck fetched successfully", truck);
  } catch (err) {
    next(err);
  }
};

// Update Truck
export const updateTruck = async (req, res, next) => {
  try {
    const { registrationNumber, companyId, status, category, type } = req.body;

    const updatedTruck = await Truck.findByIdAndUpdate(
      req.params.id,
      {
        registrationNumber,
        companyId,
        status,
        category,
        type,
        updatedBy: req.user._id,
      },
      { new: true, runValidators: true }
    );

    if (!updatedTruck) {
      const error = new Error("Truck not found");
      error.statusCode = 404;
      return next(error);
    }

    return sendResponse(res, 200, "Truck updated successfully", updatedTruck);
  } catch (err) {
    next(err);
  }
};

// Delete Truck
export const deleteTruck = async (req, res, next) => {
  try {
    const deletedTruck = await Truck.findByIdAndDelete(req.params.id);
    if (!deletedTruck) {
      const error = new Error("Truck not found");
      error.statusCode = 404;
      return next(error);
    }
    return sendResponse(res, 200, "Truck deleted successfully", null);
  } catch (err) {
    next(err);
  }
};
