import mongoose from "mongoose";

const Schema = mongoose.Schema;

const locationSchema = new Schema(
  {
    locationName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    distanceKm: {
      type: Number,
      required: true,
      min: 0,
    },
    cashRate20Ft: {
      type: Number,
      required: true,
      min: 0,
    },
    cashRate40Ft: {
      type: Number,
      required: true,
      min: 0,
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
  },
  { timestamps: true }
);

const Location = mongoose.model("Location", locationSchema);
export default Location;
