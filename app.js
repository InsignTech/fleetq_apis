import express from "express";
import "dotenv/config";
import connectDB from "./config/connection.js"
import userRoutes from './routes/userRoutes.js'


const app = express();

app.use(express.json());

const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => {
  res.send("Hello world !");
});


app.use("/user",userRoutes)
app.listen(PORT, () => {
  console.log(`server is running on ${PORT}`);
});

connectDB()

