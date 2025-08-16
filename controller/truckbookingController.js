import TruckBooking from "../models/truckBookingSchema.js";
import mongoose from "mongoose";
import { sendResponse } from "../utils/responseHandler.js";
import { STATUS } from "../utils/constants/statusEnum.js";
import User from "../models/userSchema.js";
import Truck from "../models/truckSchema.js";
import axios from "axios";
import { buildTruckBookingListPayload } from "../flows/buildTruckBookingListPayload.js";

// Create Truck Booking
export const createTruckBooking = async (req, res, next) => {
  try {
    const { companyId, truckId, date, contactName, contactNumber, remarks } =
      req.body;

    // Validate required fields
    if (!companyId || !truckId || !contactName || !contactNumber) {
      return next({ statusCode: 400, message: "Missing required fields" });
    }

    const existingBooking = await TruckBooking.findOne({
      truckId,
      status: STATUS.INQUEUE,
    });

    if (existingBooking) {
      return next({
        statusCode: 400,
        message: "Truck already has a booking in INQUEUE status",
      });
    }

    const booking = await TruckBooking.create({
      companyId,
      truckId,
      date: date ? new Date(date) : new Date(),
      status: STATUS.INQUEUE,
      contactName,
      contactNumber,
      remarks,
      createdUserId: req.user._id,
    });

    return sendResponse(
      res,
      201,
      "Truck booking created successfully",
      booking
    );
  } catch (err) {
    next(err);
  }
};

// Get All Truck Bookings (optional filter by company or status)
export const getTruckBookings = async (req, res, next) => {
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

    const bookings = await TruckBooking.find(filter).sort({ date: 1 });

    return sendResponse(
      res,
      200,
      "Truck bookings fetched successfully",
      bookings
    );
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

    return sendResponse(
      res,
      200,
      "Truck booking fetched successfully",
      booking
    );
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

    const updatedBooking = await TruckBooking.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedBooking) {
      return next({ statusCode: 404, message: "Truck booking not found" });
    }

    return sendResponse(
      res,
      200,
      "Truck booking updated successfully",
      updatedBooking
    );
  } catch (err) {
    next(err);
  }
};

export const getTruckBookingByMobileNumber = async (req, res, next) => {
  try {
    const { mobileNumber, status } = req.query;

    if (!mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "mobile Number query parameter is required",
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

    const trucks = await TruckBooking.find(filter).sort({ date: 1 });

    return sendResponse(
      res,
      200,
      "Truck bookings fetched successfully",
      trucks
    );
  } catch (err) {
    next(err);
  }
};

export const getAvailableTrucks = async (req, res, next) => {
  try {
    // Find all truckIds currently in INQUEUE status
    const bookedTrucks = await TruckBooking.find({
      status: STATUS.INQUEUE,
    }).distinct("truckId");

    // Find trucks NOT in that list (available trucks)
    const availableTrucks = await Truck.find({
      _id: { $nin: bookedTrucks },
    });

    return sendResponse(
      res,
      200,
      "Available trucks fetched successfully",
      availableTrucks
    );
  } catch (err) {
    next(err);
  }
};

export const pushAvailableTrucks = async (req, res, next) => {
  try {
    const { containerSize, phoneNumber } = req.body;

    console.log("🚀 pushAvailableTrucks started");
    console.log("📥 Request body:", req.body);

    // Validation
    if (!containerSize) {
      console.log("⚠️ Truck type missing");
      return sendResponse(res, 200, "Truck type is required", { isTruckAvailable: false });
    }
    if (!phoneNumber) {
      console.log("⚠️ Phone number missing");
      return sendResponse(res, 200, "Phone number is required", { isTruckAvailable: false });
    }

    // Step 1: Find booked trucks
    console.log("🔎 Fetching booked trucks...");
    const bookedTrucks = await TruckBooking.find({
      status: STATUS.INQUEUE,
    }).distinct("truckId");
    console.log("📌 Booked truck IDs:", bookedTrucks);

    // Step 2: Find available trucks
    console.log(`🔎 Fetching available trucks of type '${containerSize}' excluding booked ones...`);
    const availableTrucks = await Truck.find({
      _id: { $nin: bookedTrucks },
      type: containerSize,
    }).limit(5);

    console.log("📌 Available trucks:", availableTrucks.map(t => t.registrationNumber));

    if (!availableTrucks.length) {
      console.log("❌ No trucks available");
      return sendResponse(res, 200, "No trucks available right now", { isTruckAvailable: false });
    }

    // Step 3: Prepare WhatsApp API call
    const apiUrl =
      "https://api.connectpanels.com/whatsapp-api/v1.0/customer/119041/bot/721911d2181a49af/template";

    console.log("🌐 API URL:", apiUrl);

    const results = [];

    for (const truck of availableTrucks) {
      if (!truck.registrationNumber) {
        console.log(`⚠️ Skipping truck with ID ${truck._id} because registrationNumber is missing`);
        continue;
      }

      // Build payload
      const payload = buildTruckBookingListPayload(
        truck.registrationNumber,
        phoneNumber,
        truck._id
      );
      console.log("📤 Payload built for truck:", truck.registrationNumber, payload);

      // API call
      try {
        console.log(`📡 Sending WhatsApp message for truck ${truck.registrationNumber}...`);
        const response = await axios.post(apiUrl, payload, {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Basic e0c18806-0a56-4479-bdb7-995caa70793c-Ic2oMya",
          },
        });

        console.log(`✅ Message sent for truck ${truck.registrationNumber}`, response.data);

        results.push({
          truck: truck.registrationNumber,
          status: "sent",
          response: response.data,
        });
      } catch (error) {
        console.error(`❌ Failed to send message for truck ${truck.registrationNumber}`, error.message);
        results.push({
          truck: truck.registrationNumber,
          status: "failed",
          error: error.message,
        });
      }
    }

    console.log("📊 Final results:", results);

    // Step 4: Send response
    return sendResponse(
      res,
      200,
      "Available trucks pushed successfully",
      { isTruckAvailable: true }
    );
  } catch (err) {
    console.error("🔥 Error in pushAvailableTrucks:", err);
    return sendResponse(res, 200, "Error Occurred", { isTruckAvailable: false });
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
