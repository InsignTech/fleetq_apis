import TruckBooking from "../models/truckBookingSchema.js";
import mongoose from "mongoose";
import { sendResponse } from "../utils/responseHandler.js"; 
import { STATUS } from "../utils/constants/statusEnum.js";

// Create Truck Booking
export const createTruckBooking = async (req, res, next) => {
  try {
    const {
      companyId,
      truckId,
      date,
      contactName,
      contactNumber,
      remarks,
    } = req.body;

    // Validate required fields
    if (
      !companyId ||
      !truckId ||
      !contactName ||
      !contactNumber
    ) {
      return next({ statusCode: 400, message: "Missing required fields" });
    }

    const booking = await TruckBooking.create({
      companyId,
      truckId,
      date: date ? new Date(date) : new Date(),
      status:STATUS.INQUEUE,
      contactName,
      contactNumber,
      remarks,
      createdUserId: req.user._id,
    });

    return sendResponse(res, 201, "Truck booking created successfully", booking);
  } catch (err) {
    next(err);
  }
};

// Get All Truck Bookings (optional filter by company or status)
export const getTruckBookings = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.companyId && mongoose.Types.ObjectId.isValid(req.query.companyId)) {
      filter.companyId = req.query.companyId;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const bookings = await TruckBooking.find(filter).sort({ date: -1 });

    return sendResponse(res, 200, "Truck bookings fetched successfully", bookings);
  } catch (err) {
    next(err);
  }
};

// Get single Truck Booking by ID
export const getTruckBookingById = async (req, res, next) => {
  try {
    const booking = await TruckBooking.findById(req.params.id);

    if (!booking) {
      return next({ statusCode: 404, message: "Truck booking not found" });
    }

    return sendResponse(res, 200, "Truck booking fetched successfully", booking);
  } catch (err) {
    next(err);
  }
};

// Update Truck Booking
export const updateTruckBooking = async (req, res, next) => {
  try {
    const id = req.params.id;

    const allowedUpdates = [
      "date",
      "status",
      "contactName",
      "contactNumber",
      "remarks",
    ];

    const updateData = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    updateData.updatedUserId = req.user._id;

    // If status is cancelled, set cancelledUserId
    if (updateData.status && updateData.status.toLowerCase() === "cancelled") {
      updateData.cancelledUserId = req.user._id;
    }

    const updatedBooking = await TruckBooking.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedBooking) {
      return next({ statusCode: 404, message: "Truck booking not found" });
    }

    return sendResponse(res, 200, "Truck booking updated successfully", updatedBooking);
  } catch (err) {
    next(err);
  }
};

// Delete Truck Booking
// export const deleteTruckBooking = async (req, res, next) => {
//   try {
//     const deletedBooking = await TruckBooking.findByIdAndDelete(req.params.id);

//     if (!deletedBooking) {
//       return next({ statusCode: 404, message: "Truck booking not found" });
//     }

//     return sendResponse(res, 200, "Truck booking deleted successfully");
//   } catch (err) {
//     next(err);
//   }
// };
