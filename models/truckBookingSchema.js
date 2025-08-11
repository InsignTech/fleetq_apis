import mongoose from "mongoose";
import { statusValues } from "../utils/constants/statusEnum.js";

const Schema = mongoose.Schema;

const truckBookingSchema = new Schema(
  {
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
      // You can add validation pattern for phone numbers here if needed
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

const TruckBooking = mongoose.model("TruckBooking", truckBookingSchema);
export default TruckBooking;
