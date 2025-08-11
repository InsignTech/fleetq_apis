import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const truckSchema = new Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 5,
      maxlength: 20,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    status: {
      type: Boolean,
      default: true, 
    },
    category: {
      type: String,
      enum: ['Trailer', 'Multiaxil'],
      required: true,
    },
    type: {
      type: Number,
      enum: [20, 40],
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const Truck = mongoose.model('Truck', truckSchema);
export default Truck;
