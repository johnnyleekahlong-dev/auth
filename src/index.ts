import express from "express";
import dotenv from "dotenv";
import { dbConnect } from "./db";
import auth from "./routes/auth";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(cookieParser());

app.use("/auth", auth);

app.listen(port, async () => {
  await dbConnect(process.env.MONGODB_URI!!);
  console.log(`Auth server is running on port: ${port}`);
});
