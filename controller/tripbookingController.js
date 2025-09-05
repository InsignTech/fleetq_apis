import TripBooking from "../models/tripbookingSchema.js";
import mongoose from "mongoose";
import { STATUS, statusValues } from "../utils/constants/statusEnum.js";
import { sendResponse } from "../utils/responseHandler.js";
import User from "../models/userSchema.js";
import { generatePDF } from "../utils/pdfService.js";
import { getCompanyByPhoneNumber } from "./userController.js";
import { allocateTruckAndTrip } from "./allocationController.js";
import axios from "axios";
import { sendTripBookingConfirmationPush } from "../flows/buildAllocationPayload.js";
import { formatDateTime } from "../utils/formatDateTime.js";

export const createTripBooking = async (req, res, next) => {
  try {
    const {
      companyId,
      partyName,
      type,
      destination,
      rate,
      remarks,
      contactName,
      contactNumber,
      count = 1,
      date,
    } = req.body;

    // ✅ 1. Validate input fields
    if (!companyId || !type || !destination || !rate) {
      return sendResponse(res, 400, "Missing required fields", {
        bookingStatus: false,
      });
    }

    // ✅ 2. Prepare trips payload
    const tripsData = Array.from({ length: count }, () => ({
      companyId,
      partyName,
      type,
      destination,
      date: date ? new Date(date) : new Date(),
      status: STATUS.INQUEUE,
      rate,
      createdUserId: req.user._id,
      remarks,
      contactName,
      contactNumber,
    }));

    // ✅ 3. Create trips in DB
    const trips = await TripBooking.create(tripsData);

    // ✅ 4. Send single success response immediately
    sendResponse(
      res,
      201,
      `${trips.length} Trip booking(s) created successfully`,
      {
        bookingStatus: true,
        totalTrips: trips.length,
        bookingTime: new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
      }
    );

    // ✅ 5. Process each trip asynchronously (position + push + allocation)
   const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

setImmediate(async () => {
  try {
    // ✅ Sort trips by creation time (or any unique order)
    const sortedTrips = trips.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    for (const trip of sortedTrips) {
      try {
        // 1. Get position based on type
        const inQueueBookings = await TripBooking.aggregate([
          { $match: { status: STATUS.INQUEUE, type: trip.type } },
          { $sort: { createdAt: 1 } },
          { $project: { _id: 1 } },
        ]);

        const position =
          inQueueBookings.findIndex((b) => b._id.toString() === trip._id.toString()) + 1;

        // 2. Send push notification
        await sendTripBookingConfirmationPush({
          tripId: trip.tripBookingId,
          type: trip.type,
          position,
          destination: trip.destination,
          bookingTime: formatDateTime(trip.date || new Date()),
          contactNumber: trip.contactNumber,
        });

        // 3. Add a small delay before processing the next trip
        await delay(10);

      } catch (innerErr) {
        console.error(`Error processing trip ${trip._id}:`, innerErr);
      }
    }
  } catch (err) {
    console.error("Error in trip processing:", err);
  }
});
  } catch (err) {
    console.error(err);
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

export const getAllTripBookings = async (req, res, next) => {
  try {
    let filter = {};

    const companyInfo = await getCompanyByPhoneNumber(req.body.phoneNumber);
    if (!companyInfo.isValid || !companyInfo.companyId) {
      return sendResponse(res, 200, "No company found for this phone number", {
        isTruckAvailable: false,
      });
    }

    // ✅ Company ID filter
    if (
      companyInfo.companyId &&
      mongoose.Types.ObjectId.isValid(companyInfo.companyId)
    ) {
      filter.companyId = companyInfo.companyId;
    }

    // ✅ Status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // ✅ Fetch Trips
    const trips = await TripBooking.find(filter).sort({ date: 1 });

    if (!trips.length) {
      return sendResponse(res, 404, "No trip bookings found");
    }

    // ✅ If trips > 5, generate PDF & send URL
    if (trips.length > 5) {
      const pdfUrl = await generatePDF({
        data: trips.map((t) => ({
          bookingId: t.tripBookingId.toString(),
          date: t.date.toISOString().split("T")[0],
          status: t.status,
          amount: t.amount || "N/A",
        })),
        headers: [
          { key: "bookingId", label: "Booking ID", width: 150 },
          { key: "date", label: "Date", width: 100 },
          { key: "status", label: "Status", width: 100 },
          { key: "amount", label: "Amount", width: 100 },
        ],
        title: "Trip Bookings",
        folderName: "trip_pdfs",
        req,
      });

      return sendResponse(res, 200, "PDF generated successfully", {
        pdfUrl,
        total: trips.length,
      });
    }

    // ✅ If <= 5, send normal response
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
    if (
      updateData.status &&
      updateData.status.toLowerCase() === STATUS.CANCELLED
    ) {
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
