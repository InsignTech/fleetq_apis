// controllers/locationController.js
import Location from "../models/locationSchema.js";
import { sendResponse } from "../utils/responseHandler.js";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
// Create Location
export const createLocation = async (req, res, next) => {
  try {
    const { locationName, distanceKm, cashRate20Ft, cashRate40Ft } = req.body;

    // Check uniqueness
    const existing = await Location.findOne({
      locationName: { $regex: `^${locationName.trim()}$`, $options: "i" },
    });

    if (existing) {
      return next({
        statusCode: 400,
        message: "Location name already exists",
      });
    }

    const location = await Location.create({
      locationName: locationName.trim(),
      distanceKm,
      cashRate20Ft,
      cashRate40Ft,
      createdBy: req.user.id, // from auth middleware
    });

    return sendResponse(res, 201, "Location created successfully", location);
  } catch (err) {
    next(err);
  }
};

// Get All Locations
export const getLocations = async (req, res, next) => {
  try {
    const locations = await Location.find()
      .populate("createdBy", "userName email")
      .populate("updatedBy", "userName email")
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, "Locations fetched successfully", locations);
  } catch (err) {
    next(err);
  }
};

export const getLocationsPDF = async (req, res, next) => {
  try {
    // 1️⃣ Fetch sorted locations with required fields only
    const locations = await Location.find(
      {},
      { locationName: 1, distanceKm: 1, _id: 0 }
    ).sort({ locationName: 1 });

    if (!locations.length) {
      return sendResponse(res, 404, "No locations found");
    }

    // 2️⃣ Create PDF storage folder if not exists
    const pdfDir = path.join(process.cwd(), "public", "location_pdfs");
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    // 3️⃣ Generate unique file name & path
    const fileName = `locations_${Date.now()}.pdf`;
    const filePath = path.join(pdfDir, fileName);

    // 4️⃣ Create PDF Document
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // 🎨 Colors & Styling
    const headerBgColor = "#1E88E5"; // Blue header background
    const headerTextColor = "#FFFFFF"; // White text in header
    const borderColor = "#CCCCCC";

    // 5️⃣ Title
    doc.fontSize(20).fillColor("#333333").text("Locations List", {
      align: "center",
    });
    doc.moveDown(1);

    // 6️⃣ Draw Table Header Background
    const tableTop = doc.y + 5;
    const startX = 50;
    const tableWidth = 500;
    const rowHeight = 25;

    doc.rect(startX, tableTop, tableWidth, rowHeight).fill(headerBgColor);

    // 7️⃣ Table Header Text
    doc
      .fillColor(headerTextColor)
      .fontSize(12)
      .text("Location Name", startX + 10, tableTop + 7, {
        width: 300,
        align: "left",
      });
    doc.text("Distance (Km)", startX + 330, tableTop + 7, {
      width: 150,
      align: "right",
    });

    // 8️⃣ Draw Border Below Header
    doc
      .moveTo(startX, tableTop + rowHeight)
      .lineTo(startX + tableWidth, tableTop + rowHeight)
      .strokeColor(borderColor)
      .stroke();

    // 9️⃣ Add Table Rows
    let y = tableTop + rowHeight + 5;
    doc.fontSize(11).fillColor("#000000");

    locations.forEach((loc, index) => {
      // Alternate Row Backgrounds for better readability
      if (index % 2 === 0) {
        doc
          .rect(startX, y - 5, tableWidth, rowHeight)
          .fill("#F8F9FA")
          .fillColor("#000000");
      }

      // Row Text
      doc.text(loc.locationName, startX + 10, y, { width: 300, align: "left" });
      doc.text(loc.distanceKm.toString(), startX + 330, y, {
        width: 150,
        align: "right",
      });

      // Reset fill color for next row
      doc.fillColor("#000000");

      y += rowHeight;
    });

    //  🔟 Footer Section
    doc.moveDown(2);
    doc
      .fontSize(10)
      .fillColor("#555555")
      .text(`Generated on: ${new Date().toLocaleString()}`, { align: "right" });

    // ✅ Finalize PDF
    doc.end();

    // Wait for the file to finish
    writeStream.on("finish", () => {
      const fileUrl = `${req.protocol}://${req.get(
        "host"
      )}/location_pdfs/${fileName}`;
      return sendResponse(res, 200, "PDF generated successfully", { fileUrl });
    });

    writeStream.on("error", (err) => next(err));
  } catch (err) {
    next(err);
  }
};

// Get Single Location
export const getLocationById = async (req, res, next) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate("createdBy", "userName email")
      .populate("updatedBy", "userName email");

    if (!location) {
      return next({ statusCode: 404, message: "Location not found" });
    }

    return sendResponse(res, 200, "Location fetched successfully", location);
  } catch (err) {
    next(err);
  }
};

//price by location name
export const getLocationDetails = async (req, res, next) => {
  try {
    const { destination, type } = req.body;

    // ✅ Validate required fields
    if (!destination || !type) {
      return sendResponse(res, 200, "Destination and type are required", {
        success: false,
      });
    }

    // ✅ Find location (case-insensitive)
    const location = await Location.findOne({
      locationName: { $regex: new RegExp(`^${destination}$`, "i") },
    });

    // ❌ If location not found
    if (!location) {
      return sendResponse(res, 200, "Location not found", {
        success: false,
      });
    }

    // ✅ Pick correct rate based on type
    let rate;
    if (type === "20") {
      rate = location.cashRate20Ft;
    } else if (type === "40") {
      rate = location.cashRate40Ft;
    } else {
      return sendResponse(res, 200, "Invalid type. Use '20' or '40", {
        success: false,
      });
    }

    // ✅ Return destination & rate only
    return sendResponse(res, 200, "Location fetched successfully", {
      destination: location.locationName,
      success: true,
      rate,
    });
  } catch (err) {
    return sendResponse(res, 200, "Location fetched failed", {
      success: false,
    });
  }
};

// Update Location
export const updateLocation = async (req, res, next) => {
  try {
    const { locationName, distanceKm, cashRate20Ft, cashRate40Ft } = req.body;

    // Unique check (ignore current doc)
    if (locationName) {
      const existing = await Location.findOne({
        locationName: locationName.trim(),
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return next({
          statusCode: 400,
          message: "Location name already exists",
        });
      }
    }

    const location = await Location.findByIdAndUpdate(
      req.params.id,
      {
        locationName: locationName?.trim(),
        distanceKm,
        cashRate20Ft,
        cashRate40Ft,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true }
    );

    if (!location) {
      return next({ statusCode: 404, message: "Location not found" });
    }

    return sendResponse(res, 200, "Location updated successfully", location);
  } catch (err) {
    next(err);
  }
};

// Delete Location
export const deleteLocation = async (req, res, next) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);
    if (!location) {
      return next({ statusCode: 404, message: "Location not found" });
    }

    return sendResponse(res, 200, "Location deleted successfully", null);
  } catch (err) {
    next(err);
  }
};
