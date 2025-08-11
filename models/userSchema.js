import bcrypt from "bcrypt";
import mongoose from "mongoose";

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    userName: {
      type: String,
      trim: true,
      required: [true, "User name is required"],
      minlength: [3, "User name must be at least 3 characters long"],
      maxlength: [50, "User name must be less than 50 characters"],
    },
    phoneNumber: {
      type: Number,
      unique: true,
      required: [true, "Phone number is required"],
      match: [/^(91)[0-9]{10}$/, 'Phone must start with 91 and be 12 digits long'],
    },
    email: {
      type: String,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, 
    },
    role: {
      type: String,
      enum: ["admin", "manager", "owner", "driver"],
      required: [true, "Role is required"],
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: function () {
        return this.role !== "admin";
      },
      validate: {
        validator: function (value) {
          if (this.role === "admin") {
            return value == null;
          }
          return true;
        },
        message: "Admins should not have a companyId",
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Hash password if present and modified
userSchema.pre("save", async function (next) {
  if (this.password && this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Password match method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
