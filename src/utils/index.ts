import { Response } from "express";
import jwt from "jsonwebtoken";

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
