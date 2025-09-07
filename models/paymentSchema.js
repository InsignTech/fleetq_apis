import mongoose from "mongoose";

const Schema = mongoose.Schema;

const paymentSchema = new Schema(
  {
    allocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripBooking",
      required: true,
    },
    paymentIdExternal: {
      type: String,
    },
    amount: {
      type: String,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
    },
    createdBy: {
      type: String,
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
