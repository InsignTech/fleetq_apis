import express from "express";
import "dotenv/config";
import connectDB from "./config/connection.js";
import userRoutes from "./routes/userRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import truckRoutes from "./routes/truckRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import tripBookingRoutes from "./routes/tripBookingRoutes.js";
import truckbookingRoutes from "./routes/truckBookingRoutes.js";
import allocationRoutes from "./routes/allocationRoutes.js";
import ReportRoutes from "./routes/ReportRoutes.js";
import errorHandler from "./middleWare/errorHandler.js";
import path from "path";
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use("/location_pdfs", express.static(path.join(process.cwd(), "public", "location_pdfs")));
app.use("/trip_pdfs", express.static(path.join(process.cwd(), "public", "trip_pdfs")));
const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => {
  res.send("Hello world !");
});

app.use("/user", userRoutes);
app.use("/company", companyRoutes);
app.use("/trucks", truckRoutes);
app.use("/locations", locationRoutes);
app.use("/tripbooking", tripBookingRoutes);
app.use("/truckbooking", truckbookingRoutes);
app.use("/allocation", allocationRoutes);
app.use("/report", ReportRoutes);
app.get('/test', (req, res) => {
  res.status(200).json({
    message: "This is a successful GET request response!",
    status: "success",
    file: "https://morth.nic.in/sites/default/files/dd12-13_0.pdf"
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`server is running on ${PORT}`);
});

connectDB();
