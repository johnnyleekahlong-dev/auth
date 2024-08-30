import { Response, Request } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

export const generateTokenAndSetCookie = (res: Response, userId: string) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET!!, {
    expiresIn: "7d",
  });

  res.cookie("token", token, {
    httpOnly: false,
    // secure: process.env.NODE_ENV === "production",
    // sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
};

// Modify verifyToken to accept a callback
export const VerifyToken = async (
  req: Request,
  res: Response,
  callback: (result: { success: boolean; user?: any; message?: string }) => void
) => {
  const token = req.body.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    callback({ success: false, message: "Token is required" });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!!);
    const user = await User.findById(decoded.userId);

    if (!user) {
      callback({ success: false, message: "User not found" });
      return;
    }

    if (!user.isVerified) {
      callback({ success: false, message: "User is not verified" });
      return;
    }

    callback({ success: true, user });
  } catch (error: any) {
    console.error("Error verifying token:", error.message);
    callback({ success: false, message: "Invalid token" });
  }
};

// redisClient.ts

// Create and configure the Redis client
export const redisClient = new IORedis(
  process.env.REDIS_URL ?? "redis://localhost:6379"
);
