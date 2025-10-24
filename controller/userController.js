import User from "../models/userSchema.js";
import generateToken from "../utils/generateToken.js";
import { sendResponse } from "../utils/responseHandler.js";

// =========================
// SIGNUP
// =========================
const userSignup = async (req, res, next) => {
  const { phoneNumber, userName, role, companyId, email, password } = req.body;

  try {
    if (!req.user || req.user.role !== "admin") {
      const error = new Error("Only admins can create new users");
      error.statusCode = 403;
      return next(error);
    }

    if (!role) {
      const error = new Error("Role is required");
      error.statusCode = 400;
      return next(error);
    }

    if (role === "admin") {
      const error = new Error("Creating admin users is not allowed");
      error.statusCode = 403;
      return next(error);
    }

    const existUserByPhone = await User.findOne({ phoneNumber });
    if (existUserByPhone) {
      const error = new Error("User with this phone number already exists");
      error.statusCode = 400;
      return next(error);
    }

    const newUser = await User.create({
      userName,
      phoneNumber,
      email,
      password,
      role,
      companyId,
      createdBy: req.user._id,
    });

    return sendResponse(res, 201, "User created successfully", newUser.toJSON());
  } catch (err) {
    return next(err);
  }
};

// =========================
// LOGIN
// =========================
const userVerify = async (req, res, next) => {
  const { phoneNumber, role } = req.body;

  try {
    if (!phoneNumber || !role) {
      const error = new Error("Phone number and role are required");
      error.statusCode = 400;
      return next(error);
    }

    const existUser = await User.findOne({ phoneNumber, role });
    if (!existUser) {
      const error = new Error("User not found with this phone number and role");
      error.statusCode = 400;
      return next(error);
    }

    return sendResponse(res, 200, "Login success", {
      token: generateToken(existUser._id),
      user: existUser.toJSON(),
    });
  } catch (err) {
    return next(err);
  }
};


const userVerifyWithCompanyType = async (req, res, next) => {
  const { phoneNumber } = req.body;

  try {
    if (!phoneNumber) {
      const error = new Error("Phone number is required");
        return sendResponse(res, 200, "Error Occured", {
      isValid:false
    });
    }

    // Find user and populate companyId
    const existUser = await User.findOne({ phoneNumber })
      .populate("companyId", "type"); 

    if (!existUser) {
      const error = new Error("User not found with this phone number and role");
        return sendResponse(res, 200, "Error Occured", {
      isValid:false
    });
    }

    // Convert mongoose doc to plain object
    const userObj = existUser.toObject();

    // Attach companyType directly in response user object
    const responseUser = {
      _id: userObj._id,
      userName: userObj.userName,
      phoneNumber: userObj.phoneNumber,
      email: userObj.email,
      role: userObj.role,
      companyId: userObj.companyId?._id || null,
      type: userObj.companyId?.type || null,
    };

    return sendResponse(res, 200, "Login success", {
      token: generateToken(existUser._id),
      user: responseUser,
       isValid: true
    });
  } catch (err) {
    return sendResponse(res, 200, "Error Occured", {
      isValid:false
    });
    // return next(err);
  }
};

// =========================
// ADMIN LOGIN
// =========================
const adminLogin = async (req, res, next) => {
  const { phoneNumber, password } = req.body;

  try {
    if (!phoneNumber || !password) {
      const error = new Error("Phone number and password are required");
      error.statusCode = 400;
      return next(error);
    }

    const adminUser = await User.findOne({ phoneNumber, role: "admin" }).select("+password");
    if (!adminUser) {
      const error = new Error("Admin not found");
      error.statusCode = 400;
      return next(error);
    }

    const isMatch = await adminUser.matchPassword(password);
    if (!isMatch) {
      const error = new Error("Incorrect password");
      error.statusCode = 400;
      return next(error);
    }

    const userObj = adminUser.toObject();
    delete userObj.password;

    return sendResponse(res, 200, "Admin login success", {
      token: generateToken(adminUser._id),
      user: userObj,
    });
  } catch (err) {
    return next(err);
  }
};

export const forwarderLogin = async (req, res, next) => {
  const { phoneNumber, password } = req.body;

  try {
    // ✅ Basic validation
    if (!phoneNumber || !password) {
      return sendResponse(res, 400, "Phone number and password are required");
    }

    // ✅ Find user by phoneNumber and populate company
    const user = await User.findOne({ phoneNumber })
      .select("+password")
      .populate("companyId");

    if (!user) {
      return sendResponse(res, 404, "User not found");
    }

    // ✅ Ensure user is linked to a forwarder company
    const company = user.companyId;
    if (!company) {
      return sendResponse(res, 400, "User is not linked to any company");
    }

    if (!["forwarder", "both"].includes(company.type)) {
      return sendResponse(
        res,
        403,
        "User’s company is not authorized (must be forwarder or both)"
      );
    }

    // ✅ Password check
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return sendResponse(res, 401, "Invalid password");
    }

    // ✅ Prepare user data for response
    const userObj = user.toObject();
    delete userObj.password;

    // ✅ Return token and user details
    return sendResponse(res, 200, "Forwarder login successful", {
      token: generateToken(user._id),
      user: userObj,
    });
  } catch (err) {
    next(err);
  }
};

// =========================
// UPDATE USER DETAILS
// =========================
const updateDetails = async (req, res, next) => {
  try {
    const id = req.params.id;

    const allowedUpdates = ["userName", "phoneNumber", "email", "password"];
    const updateData = {};

    for (let key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    updateData.updatedBy = req.user._id;

    const updateUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updateUser) {
      const error = new Error("User not found");
      error.statusCode = 404;
      return next(error);
    }

    return sendResponse(res, 200, "User details updated successfully", updateUser.toJSON());
  } catch (err) {
    return next(err);
  }
};

const getCompanyByPhoneNumber = async (phoneNumber) => {
  if (!phoneNumber) {
    return { isValid: false, message: "Phone number is required" };
  }

  const user = await User.findOne({ phoneNumber }).populate("companyId", "type");

  if (!user) {
    return { isValid: false, message: "User not found", companyId: null };
  }

  return {
    isValid: true,
    companyId: user.companyId?._id || null,
    type: user.companyId?.type || null,
  };
};



export { userSignup, userVerify, updateDetails, adminLogin, userVerifyWithCompanyType,getCompanyByPhoneNumber };
