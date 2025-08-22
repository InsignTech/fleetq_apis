import TripBooking from "../models/tripbookingSchema.js";
import mongoose from "mongoose";
import { STATUS, statusValues } from "../utils/constants/statusEnum.js";
import { sendResponse } from "../utils/responseHandler.js";
import User from '../models/userSchema.js'; 
// Create a new trip booking
export const createTripBooking = async (req, res, next) => {
  try {
    const { companyId, partyName, type, destination, rate, remarks, contactName, contactNumber } =
      req.body;

    // Validate required fields
    if (!companyId || !type || !destination || !rate) {
      return next({ statusCode: 400, message: "Missing required fields" });
    }

    // Create new trip booking document
    const trip = await TripBooking.create({
      companyId,
      partyName,
      type,
      destination,
      date: new Date(),
      status: STATUS.INQUEUE,
      rate,
      createdUserId: req.user._id,
      remarks,
      contactName,
      contactNumber
    });

    return sendResponse(res, 201, "Trip booking created successfully", trip);
  } catch (err) {
    next(err);
  }
};

// Get all trip bookings (optionally filter by company or status)
export const getTripBookings = async (req, res, next) => {
  try {
    const filter = {};

    if (
      req.query.companyId &&
      mongoose.Types.ObjectId.isValid(req.query.companyId)
    ) {
      filter.companyId = req.query.companyId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const trips = await TripBooking.find(filter).sort({ date: 1 });

    return sendResponse(res, 200, "Trip bookings fetched successfully", trips);
  } catch (err) {
    next(err);
  }
};

// Get single trip booking by ID
export const getTripBookingById = async (req, res, next) => {
  try {
    const trip = await TripBooking.findById(req.params.id);

    if (!trip) {
      return next({ statusCode: 404, message: "Trip booking not found" });
    }

    return sendResponse(res, 200, "Trip booking fetched successfully", trip);
  } catch (err) {
    next(err);
  }
};

// Update trip booking
export const updateTripBooking = async (req, res, next) => {
  try {
    const id = req.params.id;

    // Fields that can be updated by client (excluding updatedUserId, cancelledUserId)
    const allowedUpdates = [
      "partyName",
      "type",
      "destination",
      "date",
      "status",
      "rate",
      "remarks",
    ];

    const updateData = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    // Always set updatedUserId from logged in user
    updateData.updatedUserId = req.user._id;

    // If status is 'cancelled', set cancelledUserId as well
    if (updateData.status && updateData.status.toLowerCase() === STATUS.CANCELLED) {
      updateData.cancelledUserId = req.user._id;
    }

    const updatedTrip = await TripBooking.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedTrip) {
      return next({ statusCode: 404, message: "Trip booking not found" });
    }

    return sendResponse(
      res,
      200,
      "Trip booking updated successfully",
      updatedTrip
    );
  } catch (err) {
    next(err);
  }
};


export const getBookingsByMobileNumber = async (req, res, next) => {
  try {
    const { mobileNumber, status } = req.query;

    if (!mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "mobileNumber query parameter is required",
      });
    }

    // Find user by mobile number
    const user = await User.findOne({ phoneNumber: mobileNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with given mobile number",
      });
    }

    const filter = { companyId: user.companyId };
    if (status) {
      filter.status = status;
    }

    const trips = await TripBooking.find(filter).sort({ date: 1 });

    return sendResponse(res, 200, "Trip bookings fetched successfully", trips);
  } catch (err) {
    next(err);
  }
};

// Delete trip booking
// export const deleteTripBooking = async (req, res, next) => {
//   try {
//     const deletedTrip = await TripBooking.findByIdAndDelete(req.params.id);

//     if (!deletedTrip) {
//       return next({ statusCode: 404, message: "Trip booking not found" });
//     }

//     return sendResponse(res, 200, "Trip booking deleted successfully");
//   } catch (err) {
//     next(err);
//   }
// };
