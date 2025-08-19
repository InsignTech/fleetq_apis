import mongoose from "mongoose";
import { statusValues } from "../utils/constants/statusEnum.js";
import Counter from "./counterSchema.js"; // import counter model

const Schema = mongoose.Schema;

const truckBookingSchema = new Schema(
  {
    truckBookingId: {
      type: String,
      unique: true,
      default: null,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    truckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Truck",
      required: true,
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
      default: "inqueue",
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
      required: true,
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
  },
  { timestamps: true }
);

// 🔹 Auto-generate truckBookingId safely using counter
truckBookingSchema.pre("save", async function (next) {
  if (this.isNew && !this.truckBookingId) {
    const counter = await Counter.findOneAndUpdate(
      { name: "truckBooking" },       // counter key
      { $inc: { seq: 1 } },           // increment by 1
      { new: true, upsert: true }     // create if not exist
    );

    this.truckBookingId =
      "FLEETTRKB" + String(counter.seq).padStart(5, "0");
  }
  next();
});

const TruckBooking = mongoose.model("TruckBooking", truckBookingSchema);
export default TruckBooking;
