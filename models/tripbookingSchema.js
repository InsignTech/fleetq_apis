import mongoose from "mongoose";
import { statusValues } from "../utils/constants/statusEnum.js";

const Schema = mongoose.Schema;

const tripBookingSchema = new Schema(
  {
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
      default: () => new Date(), // default current date
    },
    status: {
      type: String,
      enum: statusValues,
      required: true,
      default: "inqueue", // or whatever default you prefer
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
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

const TripBooking = mongoose.model("TripBooking", tripBookingSchema);
export default TripBooking;
