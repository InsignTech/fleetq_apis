// controllers/locationController.js
import Location from "../models/locationSchema.js";
import { sendResponse } from "../utils/responseHandler.js";

// Create Location
export const createLocation = async (req, res, next) => {
  try {
    const { locationName, distanceKm, cashRate20Ft, cashRate40Ft } = req.body;

    // Check uniqueness
    const existing = await Location.findOne({
      locationName: { $regex: `^${locationName.trim()}$`, $options: "i" },
    });

    if (existing) {
      return next({
        statusCode: 400,
        message: "Location name already exists",
      });
    }

    const location = await Location.create({
      locationName: locationName.trim(),
      distanceKm,
      cashRate20Ft,
      cashRate40Ft,
      createdBy: req.user.id, // from auth middleware
    });

    return sendResponse(res, 201, "Location created successfully", location);
  } catch (err) {
    next(err);
  }
};

// Get All Locations
export const getLocations = async (req, res, next) => {
  try {
    const locations = await Location.find()
      .populate("createdBy", "userName email")
      .populate("updatedBy", "userName email")
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, "Locations fetched successfully", locations);
  } catch (err) {
    next(err);
  }
};

// Get Single Location
export const getLocationById = async (req, res, next) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate("createdBy", "userName email")
      .populate("updatedBy", "userName email");

    if (!location) {
      return next({ statusCode: 404, message: "Location not found" });
    }

    return sendResponse(res, 200, "Location fetched successfully", location);
  } catch (err) {
    next(err);
  }
};

// Update Location
export const updateLocation = async (req, res, next) => {
  try {
    const { locationName, distanceKm, cashRate20Ft, cashRate40Ft } = req.body;

    // Unique check (ignore current doc)
    if (locationName) {
      const existing = await Location.findOne({
        locationName: locationName.trim(),
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return next({
          statusCode: 400,
          message: "Location name already exists",
        });
      }
    }

    const location = await Location.findByIdAndUpdate(
      req.params.id,
      {
        locationName: locationName?.trim(),
        distanceKm,
        cashRate20Ft,
        cashRate40Ft,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true }
    );

    if (!location) {
      return next({ statusCode: 404, message: "Location not found" });
    }

    return sendResponse(res, 200, "Location updated successfully", location);
  } catch (err) {
    next(err);
  }
};

// Delete Location
export const deleteLocation = async (req, res, next) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);
    if (!location) {
      return next({ statusCode: 404, message: "Location not found" });
    }

    return sendResponse(res, 200, "Location deleted successfully", null);
  } catch (err) {
    next(err);
  }
};
