import Allocation from "../models/allocationSchema.js";
import mongoose from "mongoose";
import { STATUS } from "../utils/constants/statusEnum.js";
import { sendResponse } from "../utils/responseHandler.js";
import TruckBooking from "../models/truckBookingSchema.js";
import TripBooking from "../models/tripbookingSchema.js"; // Assuming you have a Trip model
import {
  sendTripAllocationNotification,
  sendTruckAllotmentNotification,
  sendTruckNotificationForAllocation,
  sendTruckNotificationForAllocationPayment,
} from "../flows/buildAllocationPayload.js";
import Payment from "../models/paymentSchema.js";
import Truck from "../models/truckSchema.js";

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

/**
 * Handles automatic allocation of trucks and trips asynchronously.
 * @param {Object} options
 * @param {Object} [options.truckBooking] - Newly created truck booking (optional)
 * @param {Object} [options.tripBooking] - Newly created trip booking (optional)
 */
export const allocateTruckAndTrip = async ({
  truckBooking = null,
  tripBooking = null,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let allocation = null;
    let trip = null;
    let truck = null;

    console.log("🚀 Allocation session started...");
    console.log("Input Params:", {
      hasTruckBooking: !!truckBooking,
      hasTripBooking: !!tripBooking,
    });

    if (truckBooking) {
      console.log(
        `🔍 Searching for pending trip matching truck type: ${truckBooking.type}`
      );
      const matchingTrip = await TripBooking.findOne({
        type: truckBooking.type,
        status: STATUS.INQUEUE,
      })
        .sort({ createdAt: 1, _id: 1 })
        .session(session);

      if (matchingTrip) {
        console.log(`🟢 Matching Trip Found: ${matchingTrip._id}`);

        allocation = await Allocation.create(
          [
            {
              truckBookingId: truckBooking._id,
              tripBookingId: matchingTrip._id,
              status: STATUS.INPROGRESS,
            },
          ],
          { session }
        );

        console.log("📦 Allocation created:", allocation[0]._id);

        truck = await TruckBooking.findByIdAndUpdate(
          truckBooking._id,
          { status: STATUS.INPROGRESS },
          { new: true, session }
        );

        trip = await TripBooking.findByIdAndUpdate(
          matchingTrip._id,
          { status: STATUS.INPROGRESS },
          { new: true, session }
        );

        console.log("✅ Status updated for Truck and Trip.");

        if (!truck.createdBy) {
          console.log("⚠️ Truck createdBy missing (no phone number).");
          throw new Error("Truck createdBy missing");
        }

        const truckdetails = await Truck.findById(truckBooking.truckId).session(
          session
        );
        console.log(
          "🚚 Truck Details Fetched:",
          truckdetails.registrationNumber
        );

        setTimeout(() => {
          sendTruckAllotmentNotification(
            truckdetails.registrationNumber,
            trip.destination || "",
            String(trip?.rate || 0),
            allocation[0]?._id,
            truck?.truckBookingId,
            truck?.createdBy
          );
        }, 10000); // 10 seconds

        console.log(
          `📨 Notification sent to Truck Owner (${truck.createdBy}).`
        );
        console.log(
          `✅ Truck ${truckBooking._id} allocated to Trip ${matchingTrip._id}`
        );
      } else {
        console.log("❌ No pending trips available for this truck type.");
      }
    }

    if (tripBooking) {
      console.log(
        `🔍 Searching for available truck for trip type: ${tripBooking.type}`
      );
      const availableTruck = await TruckBooking.findOne({
        status: STATUS.INQUEUE,
      })
        .populate({
          path: "truckId",
          match: { type: tripBooking.type },
        })
        .sort({ createdAt: 1, _id: 1 })
        .session(session);

      if (availableTruck && availableTruck.truckId) {
        console.log(`🟢 Matching Truck Found: ${availableTruck._id}`);

        allocation = await Allocation.create(
          [
            {
              truckBookingId: availableTruck._id,
              tripBookingId: tripBooking._id,
              status: STATUS.INPROGRESS,
            },
          ],
          { session }
        );

        console.log("📦 Allocation created:", allocation[0]._id);

        truck = await TruckBooking.findByIdAndUpdate(
          availableTruck._id,
          { status: STATUS.INPROGRESS },
          { new: true, session }
        );

        trip = await TripBooking.findByIdAndUpdate(
          tripBooking._id,
          { status: STATUS.INPROGRESS },
          { new: true, session }
        );

        console.log("✅ Status updated for Truck and Trip.");

        const truckdetails = await Truck.findById(truck.truckId).session(
          session
        );
        if (!truck.createdBy) {
          console.log("⚠️ Truck createdBy missing (no phone number).");
          throw new Error("Truck createdBy missing");
        }

        setTimeout(() => {
          sendTruckAllotmentNotification(
            truckdetails.registrationNumber,
            trip.destination || "",
            String(trip?.rate || 0),
            allocation[0]?._id,
            truck?.truckBookingId,
            truck?.createdBy
          );
        }, 10000); // 10 seconds

        console.log(
          `📨 Notification sent to Truck Owner (${truck.createdBy}).`
        );
        console.log(
          `✅ Trip ${tripBooking._id} allocated to Truck ${availableTruck._id}`
        );
      } else {
        console.log("❌ No available trucks for this trip type.");
      }
    }

    await session.commitTransaction();
    console.log("🟢 Allocation transaction committed successfully.");
  } catch (error) {
    console.error("❌ Error during allocation:", error.message);
    console.log("⏪ Rolling back all changes...");

    await session.abortTransaction();
    console.log("🔁 Transaction reverted successfully.");
  } finally {
    session.endSession();
    console.log("🏁 Allocation session closed.");
  }
};

export const getPaymentData = async (req, res, next) => {
  try {
    const { allocationId, orderId, status, createdBy } = req.body;

    // 1. Find allocation and populate tripBookingId to get amount
    const allocation = await Allocation.findById(allocationId).populate(
      "tripBookingId"
    );
    if (!allocation) {
      return res.status(404).json({ message: "Allocation not found" });
    }

    const trip = allocation.tripBookingId;
    if (!trip) {
      return res.status(404).json({ message: "Trip not found in allocation" });
    }

    // 2. Get amount from trip (assuming 'rate' is the amount)
    const amount = trip.rate;

    // 3. Create payment record
    const payment = await Payment.create({
      allocationId,
      orderId: orderId || "",
      amount: String(2),
      createdBy: createdBy || "",
    });
    console.log(payment);
    let paymentData = [
      {
        name: "Platform Fee",
        item_price: 2,
        quantity: "1",
        country_of_origin: "India",
        importer_name: "",
        importer_address: {
          address_line1: "",
          address_line2: "",
          city: "",
          postal_code: "",
          country_code: "",
        },
        description: "Platform Fee",
        discounted_price: "",
        currency: "INR",
      },
    ];

    console.log(payment);
    let response = {
      paymentData,
      paymentId: payment?._id,
    };
    // 4. Respond with payment info
    res.status(201).json(response);
    return sendResponse(res, 201, "Company created successfully", response);
  } catch (err) {
    next(err);
  }
};

export const paymentSuccess = async (req, res, next) => {
  try {
    const { allocationId, paymentIdExternal, phoneNumber } = req.body;

    // // 1. Find payment
    // const payment = await Payment.findById(paymentId);
    // if (!payment) {
    //   return res.status(200).json({
    //     status: "false",
    //     message: "Payment not found",
    //   });
    // }

    // // 2. Handle already success
    // if (payment.status === "success") {
    //   return res.status(200).json({
    //     status: "true",
    //     message: "Payment already marked as success",
    //   });
    // }

    // // 3. Update payment status
    // payment.status = "success";
    // await payment.save();

    // 2. Get allocationId from payment
    if (!allocationId) {
      return res
        .status(200)
        .json({ status: "false", message: "No allocationId " });
    }

    // 3. Find allocation and get truckBookingId, tripBookingId
    const allocation = await Allocation.findById(allocationId);
    if (!allocation) {
      return res.status(404).json({ message: "Allocation not found" });
    }
    const { truckBookingId, tripBookingId } = allocation;

    allocation.status = STATUS.ALLOCATED;
    allocation.save();
    // 4. Fetch truck and trip details
    const truckBooking = await TruckBooking.findById(truckBookingId).populate(
      "truckId"
    );
    const tripBooking = await TripBooking.findById(tripBookingId);

    if (!truckBooking || !tripBooking) {
      return res
        .status(200)
        .json({ status: "false", message: "Truck or Trip booking not found" });
    }

    await TruckBooking.findByIdAndUpdate(truckBooking._id, {
      status: STATUS.ALLOCATED,
    });
    await TripBooking.findByIdAndUpdate(tripBooking._id, {
      status: STATUS.ALLOCATED,
    });
    // 5. Send WhatsApp API messages
    // You may need to adjust the arguments as per your flows/buildAllocationPayload.js

    await sendTruckNotificationForAllocation(
      truckBooking?.truckId?.registrationNumber || " ",
      tripBooking.createdBy || "", // 2. Forwarder/Shipper
      tripBooking.destination || "",
      String(tripBooking.rate || 0),
      truckBooking.truckBookingId || "",
      truckBooking.createdBy || truckBooking.contactNumber,
      truckBooking?.truckId?.type || " ",
      tripBooking.contactName,
      tripBooking.contactNumber
    );

    await sendTripAllocationNotification(
      tripBooking.destination || "",
      String(tripBooking.rate || 0),
      truckBooking.createdBy || "",
      truckBooking?.truckId?.registrationNumber || " ",
      truckBooking?.truckId?.type || " ",
      truckBooking.contactName || "",
      truckBooking.contactNumber || "",
      tripBooking.tripBookingId || "",
      tripBooking.createdBy || tripBooking.contactNumber
    );

    return res.status(200).json({
      message: "Payment marked as success and notifications sent",
      status: "true",
    });
  } catch (err) {
    next(err);
  }
};
