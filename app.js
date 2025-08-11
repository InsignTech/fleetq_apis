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
import errorHandler from "./middleWare/errorHandler.js";

const app = express();

app.use(express.json());

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

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`server is running on ${PORT}`);
});

connectDB();
