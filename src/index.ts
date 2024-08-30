import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { dbConnect } from "./db";
import auth from "./routes/auth";
import cors from "cors";
import RedisStore from "connect-redis";
import session from "express-session";
import IORedis from "ioredis";
import { Request, Response, NextFunction } from "express";

dotenv.config();

const app = express();
const port = process.env.PORT;

const redisClient = new IORedis({
  port: 18925,
  host: "redis-18925.c292.ap-southeast-1-1.ec2.redns.redis-cloud.com",
  password: "U3FOEF5MBQTs4OjZguuxovNVXLNmKuTP",
});
// const redisClient = new IORedis(process.env.REDIS_URL!!);

// Handle Redis connection errors
redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

// Handle Redis connection open event
redisClient.on("connect", () => {
  console.log("Connected to Redis");
});

app.use(
  session({
    name: "sid",
    store: new RedisStore({ client: redisClient, prefix: "sess" }),
    secret: process.env.SESSION_SECRET!!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // transmit only if HTTPS
      httpOnly: true, // prevent client-side JS from reading the cookie
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());
// app.use(cookieParser());
app.use("/auth", auth);

app.get("/check-session", (req: Request, res: Response) => {
  console.log(req.session);
  if (req.session.userId) {
    res.status(200).json({ success: true, userId: req.session.userId });
  } else {
    res.status(401).json({ success: false, message: "Not authenticated" });
  }
});

app.listen(port, async () => {
  await dbConnect(process.env.MONGODB_URI!!);
  console.log(`Auth server is running on port: ${port}`);
});
