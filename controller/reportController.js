import TripBooking from "../models/tripbookingSchema.js";
import Allocation from "../models/allocationSchema.js";
import TruckBooking from "../models/truckBookingSchema.js";
import Company from "../models/companySchema.js";
import { sendResponse } from "../utils/responseHandler.js";


export const getReport = async (req, res, next) => {
  try {
    let { fromDate, toDate, companyId } = req.body;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Normalize input
    if (!fromDate && !toDate) {
      fromDate = todayStr;
      toDate = todayStr;
    } else if (!fromDate && toDate) {
      fromDate = toDate;
    } else if (fromDate && !toDate) {
      toDate = fromDate;
    }

    const from = new Date(fromDate + "T00:00:00.000Z");
    const to = new Date(toDate + "T23:59:59.999Z");

    // --- Transporter Report ---
   const queryTransporter = {
  createdAt: { $gte: from, $lte: to }
};

// Add companyId conditionally
if (companyId) {
  queryTransporter.companyId = companyId;
}

const truckBookings = await TruckBooking.find(queryTransporter).populate("truckId");
    const transporterReport = [];
    for (const tb of truckBookings) {
      const allocation = await Allocation.findOne({ truckBookingId: tb._id });
      let trip = null, forwarderName = null, allocatedOn = null, place = null, rate = null, remarks = null;;
      if (allocation) {
        allocatedOn = allocation.allocatedOn;
        remarks = allocation.remarks;
        trip = await TripBooking.findById(allocation.tripBookingId).populate("companyId");
        if (trip) {
          forwarderName = trip.companyId?.name || "";
          place = trip.destination;
          rate = trip.rate;
        }
      }
      transporterReport.push({
        truckBookingId: trip.truckBookingId,
        registrationNumber: tb.truckId?.registrationNumber,
        type: tb.truckId?.type,
        status: tb.status,
        forwarderName,
        allocatedOn,
        place,
        rate,
        allocationRemarks: remarks,
        truckBookingRemarks: tb.remarks,
        bookingTime: tb.createdAt,
        allocatedTime: allocatedOn,
      });
    }

   // --- Forwarder Report ---
const query = {
  createdAt: { $gte: from, $lte: to }
};

// Add companyId conditionally
if (companyId) {
  query.companyId = companyId;
}

const tripBookings = await TripBooking.find(query);

    const forwarderReport = [];
    for (const trip of tripBookings) {
      const allocation = await Allocation.findOne({ tripBookingId: trip._id });
      let truck = null, transporterName = null, allocatedOn = null, regNumber = null, rate = trip.rate, remarks = null;
      if (allocation) {
        allocatedOn = allocation.allocatedOn;
        remarks = allocation.remarks;
        truck = await TruckBooking.findById(allocation.truckBookingId).populate("truckId companyId");
        if (truck) {
          transporterName = truck.companyId?.name || "";
          regNumber = truck.truckId?.registrationNumber;
        }
      }
      forwarderReport.push({
        tripBookingId: trip.tripBookingId,
        partyName: trip.partyName,
        type: trip.type,
        status: trip.status,
        transporterName,
        regNumber,
        allocatedOn,
        rate,
        allocationRemarks: remarks,
        TripRemarks: trip.remarks,
        bookingTime: trip.createdAt,
        allocatedTime: allocatedOn,
      });
    }

    // Return both reports
    return sendResponse(res, 200, "Reports fetched successfully", {
      transporterReport,
      forwarderReport
    });
  } catch (err) {
    return sendResponse(res, 400, "Error generating report", { error: err.message });
  }
};


export const getTransporterReport = async (req, res, next) => {
  try {
    let { fromDate, toDate, companyId } = req.body;
    // ...date logic as before...

    // Find all truck bookings for this transporter in date range
    const truckBookings = await TruckBooking.find({
      companyId,
      createdAt: { $gte: from, $lte: to }
    }).populate("truckId");

    // For each truck booking, find allocation and trip
    const report = [];
    for (const tb of truckBookings) {
      const allocation = await Allocation.findOne({ truckBookingId: tb._id });
      let trip = null, forwarderName = null, allocatedOn = null, place = null, rate = null;
      if (allocation) {
        allocatedOn = allocation.allocatedOn;
        trip = await TripBooking.findById(allocation.tripBookingId).populate("companyId");
        if (trip) {
          forwarderName = trip.companyId?.name || "";
          place = trip.destination;
          rate = trip.rate;
        }
      }
      report.push({
        registrationNumber: tb.truckId?.registrationNumber,
        type: tb.truckId?.type,
        status: tb.status,
        forwarderName,
        allocatedOn,
        place,
        rate,
        remarks: tb.remarks,
        bookingTime: tb.createdAt,
        allocatedTime: allocatedOn,
      });
    }
    return sendResponse(res, 200, "Transporter report", report);
  } catch (err) {
    return sendResponse(res, 400, "Error generating report", { error: err.message });
  }
};




export const getForwarderReport = async (req, res, next) => {
  try {
    let { fromDate, toDate, companyId } = req.body;
    // ...date logic as before...

    // Find all trip bookings for this forwarder in date range
    const tripBookings = await TripBooking.find({
      companyId,
      createdAt: { $gte: from, $lte: to }
    });

    const report = [];
    for (const trip of tripBookings) {
      const allocation = await Allocation.findOne({ tripBookingId: trip._id });
      let truck = null, transporterName = null, allocatedOn = null, regNumber = null, rate = trip.rate;
      if (allocation) {
        allocatedOn = allocation.allocatedOn;
        truck = await TruckBooking.findById(allocation.truckBookingId).populate("truckId companyId");
        if (truck) {
          transporterName = truck.companyId?.name || "";
          regNumber = truck.truckId?.registrationNumber;
        }
      }
      report.push({
        partyName: trip.partyName,
        type: trip.type,
        status: trip.status,
        transporterName,
        regNumber,
        allocatedOn,
        rate,
        remarks: trip.remarks,
        bookingTime: trip.createdAt,
        allocatedTime: allocatedOn,
      });
    }
    return sendResponse(res, 200, "Forwarder report", report);
  } catch (err) {
    return sendResponse(res, 400, "Error generating report", { error: err.message });
  }
};