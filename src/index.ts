import express from "express";
import dotenv from "dotenv";
import { dbConnect } from "./db";
import auth from "./routes/auth";
import cookieParser from "cookie-parser";
import cors from "cors";
import { sendEmail } from "./nodemailer";

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(
  cors({
    origin: "http://localhost:3000", // Your frontend URL
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  sendEmail(
    "johnnyleekahlong@hotmail.com",
    "Welcome to our service",
    "welcome",
    { userName: "John" }
  );

  res.json({ message: "Email sent" });
});

app.use("/auth", auth);

app.listen(port, async () => {
  await dbConnect(process.env.MONGODB_URI!!);
  console.log(`Auth server is running on port: ${port}`);
});
