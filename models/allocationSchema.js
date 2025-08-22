import mongoose from "mongoose";
import { STATUS, statusValues } from "../utils/constants/statusEnum.js";

const Schema = mongoose.Schema;

const allocationSchema = new Schema(
  {
    tripBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripBooking",
      required: true,
    },
    truckBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TruckBooking",
      required: true,
    },
    status: {
      type: String,
      enum: [STATUS.INPROGRESS,STATUS.ACCEPTED,STATUS.REJECTED,STATUS.ALLOCATED, STATUS.CANCELLED, STATUS.AUTOCANCELLED],
      required: true,
      default: STATUS.INPROGRESS,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    allocatedOn: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
     cancelledby: {
      type: Number
    },
  },
  { timestamps: true }
);

const Allocation = mongoose.model("Allocation", allocationSchema);
export default Allocation;
