import TruckBooking from "../models/truckBookingSchema.js";
import mongoose from "mongoose";
import { sendResponse } from "../utils/responseHandler.js";
import { STATUS } from "../utils/constants/statusEnum.js";
import User from "../models/userSchema.js";
import Truck from "../models/truckSchema.js";
import axios from "axios";
import { buildTruckBookingListPayload } from "../flows/buildTruckBookingListPayload.js";
import {
  buildTripAllocationPayload,
  buildTruckAllocationPayload,
} from "../flows/buildAllocationPayload.js";
import { getCompanyByPhoneNumber } from "./userController.js";
import Allocation from "../models/allocationSchema.js";
import TripBooking from "../models/tripbookingSchema.js";
import { allocateTruckAndTrip } from "./allocationController.js";
import { formatDateTime } from "../utils/formatDateTime.js";

const apiUrl =
  "https://api.connectpanels.com/whatsapp-api/v1.0/customer/119041/bot/721911d2181a49af/template";



export const createTruckBooking = async (req, res, next) => {
  try {
    const { companyId, truckId, date, contactName, contactNumber, phoneNumber, remarks } =
      req.body;

    // Validate input
    if (!companyId || !truckId || !contactName || !contactNumber || !phoneNumber) {
      return sendResponse(res, 400, "Missing required fields", {
        bookingStatus: false,
      });
    }

    // Check if truck exists
    const truckExist = await Truck.findById(truckId);
    if (!truckExist) {
      return sendResponse(res, 404, "Truck not found", {
        bookingStatus: false,
      });
    }

    // Check if truck already booked
    const existingBooking = await TruckBooking.findOne({
      truckId,
      status: STATUS.INQUEUE,
    });
    if (existingBooking) {
      return sendResponse(
        res,
        409,
        "Truck already has a booking in INQUEUE status",
        { bookingStatus: false }
      );
    }

    // Create truck booking
    const booking = await TruckBooking.create({
      companyId,
      truckId,
      date: date ? new Date(date) : new Date(),
      status: STATUS.INQUEUE,
      contactName,
      contactNumber,
      remarks,
      createdUserId: req?.user?._id || null,
      createdBy: phoneNumber
    });

    const inQueueBookings = await TruckBooking.aggregate([
      {
        $match: { status: STATUS.INQUEUE },
      },
      {
        $lookup: {
          from: "trucks", 
          localField: "truckId",
          foreignField: "_id",
          as: "truck",
        },
      },
      { $unwind: "$truck" },
      { $match: { "truck.type": truckExist.type } },
      { $sort: { createdAt: 1 } },
      { $project: { _id: 1 } },
    ]);

    const position =
      inQueueBookings.findIndex(
        (b) => b._id.toString() === booking._id.toString()
      ) + 1;

    // Respond immediately
    sendResponse(res, 201, "Truck booking created successfully", {
      bookingStatus: true,
      position: position,
      bookingId: booking.truckBookingId,
      bookingTime: formatDateTime(booking.date)
    });

    truckExist.type
    // Trigger allocation in the background
    if(process.env.AutoAllocation == "true"){
       booking.type = truckExist.type;
      setImmediate(() => allocateTruckAndTrip({ truckBooking: booking }));
    }
  } catch (err) {
    console.error(err);
    return sendResponse(res, 500, "Error Occurred", { bookingStatus: false });
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

//not used
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
    const { phoneNumber, containerSize } = req.body || {};

    // Validation
    if (!containerSize) {
      return sendResponse(res, 200, "Truck type is required", {
        isTruckAvailable: false,
      });
    }
    if (!phoneNumber) {
      return sendResponse(res, 200, "Phone number is required", {
        isTruckAvailable: false,
      });
    }

    const companyInfo = await getCompanyByPhoneNumber(phoneNumber);
    if (!companyInfo.isValid || !companyInfo.companyId) {
      return sendResponse(res, 200, "No company found for this phone number", {
        isTruckAvailable: false,
      });
    }

    // Step 1: Find booked trucks
    const bookedTrucks = await TruckBooking.find({
      status: STATUS.INQUEUE,
    }).distinct("truckId");

    // Step 2: Find available trucks
    const availableTrucks = await Truck.find({
      _id: { $nin: bookedTrucks },
      type: containerSize,
      companyId: companyInfo.companyId,
    }).limit(5);

    if (!availableTrucks.length) {
      console.log("❌ No trucks available");
      return sendResponse(res, 200, "No trucks available right now", {
        isTruckAvailable: false,
      });
    }

    // Step 3: Prepare WhatsApp API call

    const results = [];

    for (const truck of availableTrucks) {
      if (!truck.registrationNumber) {
        console.log(
          `⚠️ Skipping truck with ID ${truck._id} because registrationNumber is missing`
        );
        continue;
      }

      // Build payload
      const payload = buildTruckBookingListPayload(
        truck.registrationNumber,
        phoneNumber,
        truck._id,
        truck.type
      );

      // API call
      try {
        console.log(
          `📡 Sending WhatsApp message for truck ${truck.registrationNumber}...`
        );
        const response = await axios.post(apiUrl, payload, {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Basic e0c18806-0a56-4479-bdb7-995caa70793c-Ic2oMya",
          },
        });

        console.log(
          `✅ Message sent for truck ${truck.registrationNumber}`,
          response.data
        );

        results.push({
          truck: truck.registrationNumber,
          status: "sent",
          response: response.data,
        });
      } catch (error) {
        console.error(
          `❌ Failed to send message for truck ${truck.registrationNumber}`,
          error.message
        );
        results.push({
          truck: truck.registrationNumber,
          status: "failed",
          error: error.message,
        });
      }
    }

    console.log("📊 Final results:", results);

    // Step 4: Send response
    return sendResponse(res, 200, "Available trucks pushed successfully", {
      isTruckAvailable: true,
    });
  } catch (err) {
    console.error("🔥 Error in pushAvailableTrucks:", err);
    return sendResponse(res, 200, "Error Occurred", {
      isTruckAvailable: false,
    });
  }
};

export const SearchAndpushAvailableTrucks = async (req, res, next) => {
  try {
    const { phoneNumber, containerSize, truckNumber } = req.body || {};

    // Validation
    if (!containerSize) {
      return sendResponse(res, 200, "Truck type is required", {
        isTruckAvailable: false,
      });
    }
    if (!phoneNumber) {
      return sendResponse(res, 200, "Phone number is required", {
        isTruckAvailable: false,
      });
    }
    if (!truckNumber) {
      return sendResponse(res, 200, "Truck number is required", {
        isTruckAvailable: false,
      });
    }

    // ✅ Get company details
    const companyInfo = await getCompanyByPhoneNumber(phoneNumber);
    if (!companyInfo.isValid || !companyInfo.companyId) {
      return sendResponse(res, 200, "No company found for this phone number", {
        isTruckAvailable: false,
      });
    }

    // ✅ Find booked trucks
    const bookedTrucks = await TruckBooking.find({
      status: STATUS.INQUEUE,
    }).distinct("truckId");

    // ✅ Find truck by number, type, and company
    const truck = await Truck.findOne({
      _id: { $nin: bookedTrucks },
      type: containerSize,
      companyId: companyInfo.companyId,
      registrationNumber: { $regex: `^${truckNumber}$`, $options: "i" },
    });

    if (!truck) {
      return sendResponse(res, 200, "No matching truck available", {
        isTruckAvailable: false,
      });
    }

    const apiUrl =
      "https://api.connectpanels.com/whatsapp-api/v1.0/customer/119041/bot/721911d2181a49af/template";

    const payload = buildTruckBookingListPayload(
      truck.registrationNumber,
      phoneNumber,
      truck._id
    );

    // API call

    console.log(
      `📡 Sending WhatsApp message for truck ${truck.registrationNumber}...`
    );
    const response = await axios.post(apiUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic e0c18806-0a56-4479-bdb7-995caa70793c-Ic2oMya",
      },
    });

    return sendResponse(res, 200, "Truck available", {
      isTruckAvailable: true,
      truck: {
        id: truck._id,
        registrationNumber: truck.registrationNumber,
        type: truck.type,
      },
    });
  } catch (err) {
    console.error("🔥 Error in SearchAvailableTrucks:", err);
    return sendResponse(res, 200, "Error Occurred", {
      isTruckAvailable: false,
    });
  }
};

export const getLatestTruckBookingByPhoneAndReg = async (req, res, next) => {
  try {
    const { phoneNumber, registrationNumber } = req.body || {};

    // ✅ Validation
    if (!phoneNumber || !registrationNumber) {
      return sendResponse(
        res,
        200,
        "Phone number and registration number are required",
        {
          bookingFound: false,
        }
      );
    }

    // ✅ Get company by phone number
    const companyInfo = await getCompanyByPhoneNumber(phoneNumber);
    if (!companyInfo.isValid || !companyInfo.companyId) {
      return sendResponse(res, 200, "No company found for this phone number", {
        bookingFound: false,
      });
    }

    // ✅ Find truck belonging to company
    const truck = await Truck.findOne({
      companyId: companyInfo.companyId,
      registrationNumber: { $regex: `^${registrationNumber}$`, $options: "i" },
    });

    if (!truck) {
      return sendResponse(
        res,
        200,
        "No truck found for this registration number",
        {
          bookingFound: false,
        }
      );
    }

    // ✅ Find latest booking for this truck
    const latestBooking = await TruckBooking.findOne({
      truckId: truck._id,
      status: {
        $in: [
          STATUS.INQUEUE,
          STATUS.INPROGRESS,
          STATUS.ACCEPTED,
          STATUS.REJECTED,
          STATUS.ALLOCATED,
        ],
      },
    })
      .sort({ createdAt: -1 }) // pick latest
      .populate("companyId", "name") // optional: include company info
      .populate("truckId", "registrationNumber type");

    if (!latestBooking) {
      return sendResponse(res, 200, "No booking found for this truck", {
        bookingFound: false,
      });
    }

    let position = null;
    let allocation = null;
    // ✅ If booking is INQUEUE → calculate position
    if (latestBooking.status === STATUS.INQUEUE) {
      const inQueueBookings = await TruckBooking.aggregate([
        { $match: { status: STATUS.INQUEUE } },
        {
          $lookup: {
            from: "trucks",
            localField: "truckId",
            foreignField: "_id",
            as: "truck",
          },
        },
        { $unwind: "$truck" },
        { $match: { "truck.type": truck.type } }, // only same feet type
        { $sort: { createdAt: 1 } },
        { $project: { _id: 1 } },
      ]);

      position =
        inQueueBookings.findIndex(
          (b) => b._id.toString() === latestBooking._id.toString()
        ) + 1;
    } else {
      const allocationDoc = await Allocation.findOne({
        truckBookingId: latestBooking._id,
      }).populate({
        path: "tripBookingId",
        populate: {
          path: "companyId",
          select: "name",
        },
        select: "companyId destination rate contactName contactNumber",
      });

      const allocatedOnIST = allocationDoc?.allocatedOn
        ? new Date(allocationDoc.allocatedOn).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
        : null;

      if (allocationDoc?.tripBookingId) {
        const trip = allocationDoc.tripBookingId;
        allocation = {
          forwarder: trip.companyId?.name || null,
          destination: trip.destination || null,
          rate: trip.rate || null,
          allocatedOn: allocatedOnIST,
          contactPerson: trip.contactName || null,
          contactNumber: trip.contactNumber || null,
        };
      }
    }

    const bookingDateIST = latestBooking?.date
      ? new Date(latestBooking.date).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })
      : null;
    return sendResponse(res, 200, "Latest truck booking fetched successfully", {
      bookingFound: true,
      truck: {
        id: truck._id,
        registrationNumber: truck.registrationNumber,
        type: truck.type,
      },
      bookingDate: bookingDateIST,
      bookingId: latestBooking.truckBookingId,
      status: latestBooking.status,
      position: position, // only if INQUEUE
      allocation: allocation, // only for allocated/inprogress etc.
    });
  } catch (err) {
    console.error("🔥 Error in getLatestTruckBookingByPhoneAndReg:", err);
    return sendResponse(res, 200, "Error Occurred", {
      bookingFound: false,
    });
  }
};

export const cancelTruckBooking = async (req, res, next) => {
  try {
    const { truckBookingId, phoneNumber, remarks } = req.body;

    // ✅ Validation
    if (!truckBookingId) {
      return sendResponse(res, 200, "Truck booking ID is required", {
        cancelled: false,
      });
    }
    if (!remarks || remarks.trim() === "") {
      return sendResponse(res, 200, "Remarks are required for cancellation", {
        cancelled: false,
      });
    }

    // ✅ Find the truck booking
    const truckBooking = await TruckBooking.findOne({
      truckBookingId: truckBookingId,
    });
    if (!truckBooking) {
      return sendResponse(res, 200, "Truck booking not found", {
        cancelled: false,
      });
    }

    // ✅ Handle statuses that can't be cancelled
    if (
      truckBooking.status === STATUS.CANCELLED ||
      truckBooking.status === STATUS.REJECTED
    ) {
      return sendResponse(
        res,
        200,
        "Truck booking is already cancelled or rejected",
        { booking: truckBooking, cancelled: false }
      );
    }

    let allocation = null;
    let tripBooking = null;

    // ✅ Fetch allocation if exists
    allocation = await Allocation.findOne({ truckBookingId: truckBooking._id });
    // ✅ Fetch trip booking if exists
    if (allocation) {
      tripBooking = await TripBooking.findById(allocation.tripBookingId);
    }

    switch (truckBooking.status) {
      case STATUS.INQUEUE:
        truckBooking.status = STATUS.CANCELLED;
        truckBooking.remarks = remarks;
        break;

      case STATUS.INPROGRESS:
        truckBooking.status = STATUS.REJECTED;
        truckBooking.remarks = remarks;

        if (allocation) {
          allocation.status = STATUS.REJECTED;
          allocation.cancelledby = phoneNumber;
          allocation.remarks = remarks;
          await allocation.save();
        }
        if (tripBooking) {
          tripBooking.status = STATUS.INQUEUE;
          await tripBooking.save();
        }
        break;

      case STATUS.ACCEPTED:
        truckBooking.status = STATUS.CANCELLED;
        truckBooking.remarks = remarks;

        if (allocation) {
          allocation.status = STATUS.CANCELLED;
          allocation.cancelledby = phoneNumber;
          allocation.remarks = remarks;
          await allocation.save();
        }
        if (tripBooking) {
          tripBooking.status = STATUS.INQUEUE;
          await tripBooking.save();
        }
        break;

      case STATUS.ALLOCATED:
        truckBooking.status = STATUS.CANCELLED;
        truckBooking.remarks = remarks;

        if (allocation) {
          allocation.status = STATUS.CANCELLED;
          allocation.cancelledby = phoneNumber;
          allocation.remarks = remarks;
          await allocation.save();
        }
        if (tripBooking) {
          tripBooking.status = STATUS.INQUEUE;
          await tripBooking.save();
        }
        break;

      default:
        return sendResponse(res, 400, "Invalid truck booking status", {
          cancelled: false,
        });
    }

    // ✅ Save truck booking changes
    await truckBooking.save();

    return sendResponse(res, 200, "Truck booking cancelled successfully", {
      booking: truckBooking,
      bookingStatus: truckBooking.status,
      cancelled: true,
    });
  } catch (error) {
    console.error("❌ Truck booking cancellation failed:", error);
    return sendResponse(res, 400, "Truck booking cancellation failed", {
      cancelled: false,
    });
  }
};



export const getTruckQueuePosition = async (truckId, truckType, bookingId) => {
  const inQueueBookings = await TruckBooking.aggregate([
    { $match: { status: STATUS.INQUEUE } },
    {
      $lookup: {
        from: "trucks",
        localField: "truckId",
        foreignField: "_id",
        as: "truck",
      },
    },
    { $unwind: "$truck" },
    { $match: { "truck.type": truckType } },
    { $sort: { createdAt: 1 } },
    { $project: { _id: 1 } },
  ]);

  return (
    inQueueBookings.findIndex(
      (b) => b._id.toString() === bookingId.toString()
    ) + 1
  );
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
