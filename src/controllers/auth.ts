import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/User";
import { generateTokenAndSetCookie } from "../utils";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    user = new User({ name, email, password });
    await user.save();

    generateTokenAndSetCookie(res, user._id as string);

    res.status(201).json({
      success: true,
      message: "User created successfully",
    });
  } catch (error: any) {
    console.error(error.message);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    const isPasswordValid = user?.comparePassword(password);

    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (!user) return;

    user.lastLogin = new Date();

    await user?.save();

    generateTokenAndSetCookie(res, user._id as string);

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
    });
  } catch (error: any) {
    console.error(error.message);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.clearCookie("token");
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
  } catch (error) {
    console.error("Error in forgotPassword: ", error);
  }
};
