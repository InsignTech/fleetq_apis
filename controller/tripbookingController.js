import TripBooking from "../models/tripbookingSchema.js";
import mongoose from "mongoose";
import { STATUS, statusValues } from "../utils/constants/statusEnum.js";
import { sendResponse } from "../utils/responseHandler.js";
import User from "../models/userSchema.js";
import { generatePDF } from "../utils/pdfService.js";
import { getCompanyByPhoneNumber } from "./userController.js";
import { allocateTruckAndTrip } from "./allocationController.js";
import axios from "axios";
import { sendTripBookingConfirmationPush, sendTruckCancellationNotification } from "../flows/buildAllocationPayload.js";
import { formatDateTime, formatDateTime24 } from "../utils/formatDateTime.js";

import Allocation from "../models/allocationSchema.js";
import TruckBooking from "../models/truckBookingSchema.js";
import { getTruckQueuePosition } from "./truckbookingController.js";
import Truck from "../models/truckSchema.js";



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
      phoneNumber,
      count = 1,
      date,
    } = req.body;
   console.log(req.body)
    // ✅ 1. Validate input fields
    if (!companyId || !type || !destination || !rate || !phoneNumber) {
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
      createdUserId: req?.user?._id || req?.body?.createdUserId || "6899983445d5bcca17e352a4" ,
      remarks,
      contactName,
      contactNumber,
      createdBy:phoneNumber
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
          contactNumber: phoneNumber,
        });

            if(process.env.AutoAllocation == "true"){
              setImmediate(() => allocateTruckAndTrip({ tripBooking: trip }));
            }
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



async function handleAllocationCancellation(allocation, phoneNumber, remarks, session) {
  allocation.status = STATUS.CANCELLED;
  allocation.cancelledby = phoneNumber;
  allocation.remarks = remarks;
  await allocation.save({ session });

  const truckBooking = await TruckBooking.findById(allocation.truckBookingId)
    .populate("truckId")
    .session(session);

  if (truckBooking) {
    truckBooking.status = STATUS.INQUEUE;
    truckBooking.remarks = remarks;
    await truckBooking.save({ session });

    const queuePosition = await getTruckQueuePosition(
      truckBooking.truckId?._id,
      truckBooking.truckId?.type,
      truckBooking._id
    );

    return {
      truckBooking,
      queuePosition,
    };
  }

  return null;
}

export const cancelTripBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { tripBookingId, phoneNumber, remarks } = req.body;

    // ✅ Validation
    if (!tripBookingId) {
      return sendResponse(res, 200, "Trip booking ID is required", {
        cancelled: false,
      });
    }
    if (!remarks || remarks.trim() === "") {
      return sendResponse(res, 200, "Remarks are required for cancellation", {
        cancelled: false,
      });
    }

    // ✅ Find booking
    const tripBooking = await TripBooking.findOne({ tripBookingId }).session(session);
    if (!tripBooking) {
      return sendResponse(res, 200, "Trip booking not found", {
        cancelled: false,
      });
    }

    // ✅ Prevent double cancellation
    if (
      tripBooking.status === STATUS.CANCELLED ||
      tripBooking.status === STATUS.REJECTED
    ) {
      return sendResponse(
        res,
        200,
        "Trip booking is already cancelled or rejected",
        { booking: tripBooking, cancelled: false }
      );
    }

    // ✅ Get allocation
    const allocation = await Allocation.findOne({
      tripBookingId: tripBooking._id,
    })
      .sort({ createdAt: -1 })
      .session(session);

    let notifyData = null;

    // ✅ Update based on status
    switch (tripBooking.status) {
      case STATUS.INQUEUE:
      case STATUS.ACCEPTED:
      case STATUS.ALLOCATED:
        tripBooking.status = STATUS.CANCELLED;
        tripBooking.remarks = remarks;
        tripBooking.cancelledby = phoneNumber;

        if (allocation) {
          notifyData = await handleAllocationCancellation(
            allocation,
            phoneNumber,
            remarks,
            session
          );
        }
        break;

      case STATUS.INPROGRESS:
        tripBooking.status = STATUS.REJECTED;
        tripBooking.remarks = remarks;
        tripBooking.cancelledby = phoneNumber;

        if (allocation) {
          allocation.status = STATUS.REJECTED;
          allocation.cancelledby = phoneNumber;
          allocation.remarks = remarks;
          await allocation.save({ session });

          let truckBooking = await TruckBooking.findById(allocation.truckBookingId)
            .populate("truckId")
            .session(session);

          if (truckBooking) {
            truckBooking.status = STATUS.INQUEUE;
            truckBooking.remarks = remarks;
            await truckBooking.save({ session });

            const queuePosition = await getTruckQueuePosition(
              truckBooking.truckId?._id,
              truckBooking.truckId?.type,
              truckBooking._id
            );

            notifyData = { truckBooking, queuePosition };
          }
        }
        break;

      default:
        await session.abortTransaction();
        session.endSession();
        return sendResponse(res, 400, "Invalid trip booking status", {
          cancelled: false,
        });
    }

    // ✅ Save booking
    await tripBooking.save({ session });

    // ✅ Commit DB changes
    await session.commitTransaction();
    session.endSession();

    // ✅ Send notification (AFTER commit)
    if (notifyData?.truckBooking) {
      await sendTruckCancellationNotification(
        notifyData.truckBooking.createdBy || notifyData.truckBooking.contactNumber,
        notifyData.truckBooking?.truckId?.registrationNumber || " ",
        notifyData.truckBooking?.truckId?.type,
        notifyData.queuePosition?.toString(),
        notifyData.truckBooking?.truckBookingId,
        formatDateTime24(notifyData.truckBooking?.date)
      );
    }

    let booking  = notifyData?.truckBooking || {}
        const truckExist = await Truck.findById(booking?.truckId);
    if (!truckExist) {
      return sendResponse(res, 404, "Truck not found", {
        bookingStatus: false,
      });
    }

            if(process.env.AutoAllocation == "true"){
              booking.type = truckExist.type;
              setImmediate(() => allocateTruckAndTrip({ truckBooking:booking }));
            }

    return sendResponse(res, 200, "Trip booking cancelled successfully", {
      booking: tripBooking,
      bookingStatus: tripBooking.status,
      cancelled: true,
    });
  } catch (error) {
    console.error("❌ Trip booking cancellation failed:", error);

    await session.abortTransaction();
    session.endSession();

    return sendResponse(res, 400, "Trip booking cancellation failed", {
      cancelled: false,
    });
  }
};

export const getPaginatedTripBookings = async (req, res, next) => {
  try {
    const filter = {};

    // ✅ Status filter (only allow valid enum values)
    if (req.query.status) {
      const status = req.query.status.toLowerCase();

      if (!statusValues.includes(status)) {
        // Send response and immediately return
        return sendResponse(
          res,
          400,
          `Invalid status value. Allowed: ${statusValues.join(", ")}`
        );
      }

      filter.status = status;
    }

    // ✅ Pagination parameters
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    // ✅ Fetch total count
    const total = await TripBooking.countDocuments(filter);

    // ✅ Fetch paginated results
    const trips = await TripBooking.find(filter)
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .populate("companyId", "name address");

    if (trips.length === 0) {
      return sendResponse(
        res,
        200,
        req.query.status
          ? `No trip bookings found with status "${req.query.status}".`
          : "No trip bookings found."
      );
    }

    // ✅ Success response
    return sendResponse(res, 200, "Trip bookings fetched successfully", {
      trips,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    // Only call next(err) if headers haven't been sent yet
    if (!res.headersSent) {
      next(err);
    } else {
      console.error("Error occurred after response was sent:", err);
    }
  }
};

export const searchTripBookings = async (req, res, next) => {
  try {
    const { tripId, companyName } = req.query;

    // If no query provided, return top 20 results (same behavior as before)
    if (!tripId && !companyName) {
      const trips = await TripBooking.find({})
        .limit(20)
        .sort({ date: 1 })
        .populate("companyId", "name address");

      return sendResponse(res, 200, "Trip bookings found", {
        trips,
        total: trips.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    }

    // Build regexes if provided
    const tripRegex = tripId ? new RegExp(tripId, "i") : null;
    const companyRegex = companyName ? new RegExp(companyName, "i") : null;

    // Build $or conditions for aggregation (match any)
    const orConditions = [];
    if (tripRegex) orConditions.push({ tripBookingId: tripRegex });
    if (companyRegex) orConditions.push({ "company.name": companyRegex });

    // Aggregation: lookup company, match either condition, sort & limit,
    // then attach company fields into companyId so shape matches .populate("companyId", ...)
    const tripsAgg = await TripBooking.aggregate([
      {
        $lookup: {
          from: "companies",
          localField: "companyId",
          foreignField: "_id",
          as: "company",
        },
      },
      { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
      { $match: { $or: orConditions } },
      { $sort: { date: 1 } },
      { $limit: 20 },
      {
        $addFields: {
          companyId: {
            _id: "$company._id",
            name: "$company.name",
            address: "$company.address",
          },
        },
      },
      { $project: { company: 0 } },
    ]);

    // Ensure we always return an array (may be empty)
    const trips = Array.isArray(tripsAgg) ? tripsAgg : [];

    return sendResponse(res, 200, "Trip bookings found", {
      trips,
      total: trips.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  } catch (err) {
    if (!res.headersSent) {
      next(err);
    } else {
      console.error("Error occurred after response was sent:", err);
    }
  }
};
