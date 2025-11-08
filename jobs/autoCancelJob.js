// jobs/autoCancelJob.js
import cron from "node-cron";
import TruckBooking from "../models/truckBookingSchema.js";
import TripBooking from "../models/tripbookingSchema.js";
import { STATUS } from "../utils/constants/statusEnum.js";

// 🔹 Schedule a job to run daily at 8 PM IST
cron.schedule(
   "0 20 * * *",// every day at 20:00 (8 PM) IST
  async () => {
    console.log("🚚 Auto-cancel job started at:", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));

    try {
      // Update all trip bookings that are still in queue or in progress
      const tripResult = await TripBooking.updateMany(
        { status: { $in: [STATUS.INQUEUE, STATUS.INPROGRESS] } },
        { $set: { status: STATUS.AUTOCANCELLED } }
      );

      // Update all truck bookings that are still in queue or in progress
      const truckResult = await TruckBooking.updateMany(
        { status: { $in: [STATUS.INQUEUE, STATUS.INPROGRESS] } },
        { $set: { status: STATUS.AUTOCANCELLED } }
      );

      console.log(`✅ Auto-cancelled ${tripResult.modifiedCount} trip bookings`);
      console.log(`✅ Auto-cancelled ${truckResult.modifiedCount} truck bookings`);
    } catch (error) {
      console.error("❌ Error running auto-cancel job:", error);
    }

    console.log("✅ Auto-cancel job completed\n");
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata", // ensures IST time
  }
);
