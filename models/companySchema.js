import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const companySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100, 
    },
    address: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 255, 
    },
    phone: {
      type: String,
      required: true,
      match: [/^(91)[0-9]{10}$/, 'Phone must start with 91 and be 12 digits long'],
    },
    type: {
      type: String,
      enum: ['forwarder', 'transporter', 'both'],
      required: true,
    },
  },
  { timestamps: true }
);

const Company = mongoose.model('Company', companySchema);
export default Company;
