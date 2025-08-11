import Company from "../models/companySchema.js";
import { sendResponse } from "../utils/responseHandler.js";

// Create a new company
export const createCompany = async (req, res, next) => {
  try {
    const { name, address, phone, type } = req.body;

    if (!name || !address || !phone || !type) {
      return next({
        statusCode: 400,
        message: "All fields are required",
      });
    }

    const existing = await Company.findOne({ phone: phone.trim() });
    if (existing) {
      return next({
        statusCode: 400,
        message: "Company with this phone already exists",
      });
    }

    const company = await Company.create({ name, address, phone, type });

    return sendResponse(res, 201, "Company created successfully", company);
  } catch (err) {
    next(err);
  }
};

// Get all companies
export const getCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    return sendResponse(res, 200, "Companies fetched successfully", companies);
  } catch (err) {
    next(err);
  }
};

// Get single company by ID
export const getCompanyById = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return next({
        statusCode: 404,
        message: "Company not found",
      });
    }
    return sendResponse(res, 200, "Company fetched successfully", company);
  } catch (err) {
    next(err);
  }
};

// Update company
export const updateCompany = async (req, res, next) => {
  try {
    const { name, address, phone, type } = req.body;

    const company = await Company.findById(req.params.id);
    if (!company) {
      return next({
        statusCode: 404,
        message: "Company not found",
      });
    }

    company.name = name || company.name;
    company.address = address || company.address;
    company.phone = phone || company.phone;
    company.type = type || company.type;

    await company.save();

    return sendResponse(res, 200, "Company updated successfully", company);
  } catch (err) {
    next(err);
  }
};

// Delete company
export const deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) {
      return next({
        statusCode: 404,
        message: "Company not found",
      });
    }
    return sendResponse(res, 200, "Company deleted successfully");
  } catch (err) {
    next(err);
  }
};
