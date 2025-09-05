import mongoose from "mongoose";
import { STATUS, statusValues } from "../utils/constants/statusEnum.js";
import Counter from "./counterSchema.js"; // ✅ import counter model

const Schema = mongoose.Schema;

const tripBookingSchema = new Schema(
  {
    tripBookingId: {
      type: String,
      unique: true,
      default: null, // ✅ not required, auto-generated
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    partyName: {
      type: String,
      trim: true,
      default: null,
    },
    type: {
      type: Number,
      enum: [20, 40],
      required: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    date: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    status: {
      type: String,
      enum: statusValues,
      required: true,
      default: STATUS.INQUEUE,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    contactName: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 100,
      required: true,
    },
    contactNumber: {
      type: String,
      trim: true,
      required: true,
    },
    createdUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancelledUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    createdBy: {
      type: String
    }
  },
  { timestamps: true }
);

// 🔹 Auto-generate tripBookingId safely using counter
tripBookingSchema.pre("save", async function (next) {
  if (this.isNew && !this.tripBookingId) {
    const counter = await Counter.findOneAndUpdate(
      { name: "tripBooking" }, // separate counter name
      { $inc: { seq: 1 } }, // increment by 1
      { new: true, upsert: true } // create if missing
    );

    this.tripBookingId = "FLEETTRPB" + String(counter.seq).padStart(5, "0");
  }
  next();
});

const TripBooking = mongoose.model("TripBooking", tripBookingSchema);
export default TripBooking;
