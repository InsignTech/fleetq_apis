import Allocation from "../models/allocationSchema.js";
import mongoose from "mongoose";
import { STATUS } from "../utils/constants/statusEnum.js";
import { sendResponse } from "../utils/responseHandler.js";
import TruckBooking from "../models/truckBookingSchema.js";
import TripBooking from "../models/tripbookingSchema.js"; // Assuming you have a Trip model
// import { sendTruckNotification, sendTripNotification } from "../utils/notifications.js";

// import { sendTruckNotification, sendTripNotification } from "./truckbookingController.js"


// Create allocation
export const createAllocation = async (req, res, next) => {
  try {
    const { tripBookingId, truckBookingId } = req.body;

    if (!tripBookingId || !truckBookingId) {
      return next({
        statusCode: 400,
        message: "tripBookingId and truckBookingId are required",
      });
    }

    // Validate status, default to ALLOCATED if not provided
    const allocationStatus = STATUS.ALLOCATED;
    if (![STATUS.ALLOCATED, STATUS.CANCELLED].includes(allocationStatus)) {
      return next({
        statusCode: 400,
        message: `Invalid status. Allowed: ${STATUS.ALLOCATED}, ${STATUS.CANCELLED}`,
      });
    }

    const allocation = await Allocation.create({
      tripBookingId,
      truckBookingId,
      status: allocationStatus,
      createdBy: req.user._id,
      allocatedOn: new Date(),
    });

    return sendResponse(
      res,
      201,
      "Allocation created successfully",
      allocation
    );
  } catch (err) {
    next(err);
  }
};

// Get all allocations (optionally filtered by tripBookingId or truckBookingId)
export const getAllocations = async (req, res, next) => {
  try {
    const filter = {};
    if (
      req.query.tripBookingId &&
      mongoose.Types.ObjectId.isValid(req.query.tripBookingId)
    ) {
      filter.tripBookingId = req.query.tripBookingId;
    }
    if (
      req.query.truckBookingId &&
      mongoose.Types.ObjectId.isValid(req.query.truckBookingId)
    ) {
      filter.truckBookingId = req.query.truckBookingId;
    }
    if (
      req.query.status &&
      [STATUS.ALLOCATED, STATUS.CANCELLED].includes(req.query.status)
    ) {
      filter.status = req.query.status;
    }

    const allocations = await Allocation.find(filter).sort({ allocatedOn: -1 });

    return sendResponse(
      res,
      200,
      "Allocations fetched successfully",
      allocations
    );
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

    return sendResponse(
      res,
      200,
      "Allocation fetched successfully",
      allocation
    );
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
        if (
          key === "status" &&
          ![STATUS.ALLOCATED, STATUS.CANCELLED].includes(req.body[key])
        ) {
          return next({
            statusCode: 400,
            message: `Invalid status. Allowed: ${STATUS.ALLOCATED}, ${STATUS.CANCELLED}`,
          });
        }
        updateData[key] = req.body[key];
      }
    }

    updateData.updatedBy = req.user._id;

    const updatedAllocation = await Allocation.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedAllocation) {
      return next({ statusCode: 404, message: "Allocation not found" });
    }

    return sendResponse(
      res,
      200,
      "Allocation updated successfully",
      updatedAllocation
    );
  } catch (err) {
    next(err);
  }
};

export const allocateTrucksToTrips = async (req, res, next) => {
//   try {
//     // 1. Fetch all INQUEUE TruckBookings sorted FIFO (oldest first)
//     const truckBookings = await TruckBooking.find({
//       status: STATUS.INQUEUE,
//     }).sort({ createdAt: 1 });

//     // 2. Fetch all TripBookings that are unallocated (or in some 'pending' status) sorted FIFO
//     const tripBookings = await TripBooking.find({
//       status: STATUS.INQUEUE,
//     }).sort({ createdAt: 1 });

//     // We'll allocate truckBookings to tripBookings by matching 'type'
//     // Assuming truckBooking and tripBooking have a 'type' field (20 or 40)

//     for (const truckBooking of truckBookings) {
//       // Find a trip booking with matching type
//       const matchedTripIndex = tripBookings.findIndex(
//         (trip) => trip.type === truckBooking.type
//       );

//       if (matchedTripIndex === -1) {
//         // No matching trip for this truck booking, skip
//         continue;
//       }

//       const tripBooking = tripBookings[matchedTripIndex];

//       // Create allocation record linking truckBooking and tripBooking
//       const allocation = new Allocation({
//         truckBookingId: truckBooking._id,
//         tripBookingId: tripBooking._id,
//         status: STATUS.ALLOCATED,
//         createdBy: req.user._id,
//         allocatedOn: new Date(),
//         // any other fields you want to store
//       });

//       await allocation.save();

//       // Update statuses so they don't get allocated again
//       truckBooking.status = STATUS.INPROGRESS;
//       truckBooking.updatedUserId = req.user._id
//       await truckBooking.save();

//       tripBooking.status = STATUS.INPROGRESS;
//        truckBooking.updatedUserId = req.user._id
//       await tripBooking.save();

//       // Remove allocated tripBooking from the array so it's not matched again
//       tripBookings.splice(matchedTripIndex, 1);
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Allocation completed successfully",
//     });
//   } catch (err) {
//     next(err);
//   }
// };

}

/**
 * Handles automatic allocation of trucks and trips asynchronously.
 * @param {Object} options
 * @param {Object} [options.truckBooking] - Newly created truck booking (optional)
 * @param {Object} [options.tripBooking] - Newly created trip booking (optional)
 */
export const allocateTruckAndTrip = async ({ truckBooking = null, tripBooking = null }) => {
  try {
    if (truckBooking) {
      // Find a pending trip for this truck
      const matchingTrip = await TripBooking.findOne({
        type: truckBooking.type,
        status: STATUS.INQUEUE,
      }).sort({ createdAt: 1 });

      if (matchingTrip) {
        await Allocation.create({
          truckBookingId: truckBooking._id,
          tripBookingId: matchingTrip._id,
          status: STATUS.INPROGRESS,
        });

        await TruckBooking.findByIdAndUpdate(truckBooking._id, { status: STATUS.INPROGRESS });
        await TripBooking.findByIdAndUpdate(matchingTrip._id, { status: STATUS.INPROGRESS });

        // Send notifications asynchronously
        // sendTruckNotification(truckBooking, matchingTrip);
        // sendTripNotification(matchingTrip, truckBooking);

        console.log(`✅ Truck ${truckBooking._id} allocated to Trip ${matchingTrip._id}`);
      }
    }

    if (tripBooking) {
      // Find a pending truck for this trip
      const availableTruck = await TruckBooking.findOne({
        type: tripBooking.type,
        status: STATUS.INQUEUE,
      }).sort({ createdAt: 1 });

      if (availableTruck) {
        await Allocation.create({
          truckBookingId: availableTruck._id,
          tripBookingId: tripBooking._id,
          status: STATUS.INPROGRESS,
        });

        await TruckBooking.findByIdAndUpdate(availableTruck._id, { status: STATUS.INPROGRESS });
        await TripBooking.findByIdAndUpdate(tripBooking._id, { status: STATUS.INPROGRESS });

        // Send notifications asynchronously
        // sendTruckNotification(availableTruck, tripBooking);
        // sendTripNotification(tripBooking, availableTruck);

        console.log(`✅ Trip ${tripBooking._id} allocated to Truck ${availableTruck._id}`);
      }
    }
  } catch (error) {
    console.error("❌ Error during allocation:", error.message);
  }
};