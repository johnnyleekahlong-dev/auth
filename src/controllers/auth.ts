import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/User";
import { generateTokenAndSetCookie, VerifyToken } from "../utils";
import jwt from "jsonwebtoken";
import { sendEmail } from "../nodemailer";
import crypto from "crypto";
import { redisClient } from "../utils";

// Extend SessionData directly in the file
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

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

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    user = new User({
      name,
      email,
      password,
      verificationToken: verificationCode,
      verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    await user.save();

    generateTokenAndSetCookie(res, user._id as string);

    sendEmail(email, "Account Verification", "verify", {
      username: name,
      verificationCode,
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
    });
  } catch (error: any) {
    console.error(error.message);
  }
};

export const verifyAccount = async (req: Request, res: Response) => {
  const { code } = req.body;
  try {
    const user = await User.findOne({
      verificationToken: code,
      verificationTokenExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    sendEmail(user.email, "Welcome Onboard", "welcome", {
      username: user.name,
    });

    res.status(200).json({
      success: true,
      message: "Account verified successfully",
    });
  } catch (error) {
    console.log("Error in verifyAccount ", error);
    res.status(500).json({ success: false, message: "Server error" });
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
    const isPasswordValid = await user?.comparePassword(password);

    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (!user) return;

    user.lastLogin = new Date();

    await user?.save();

    // req.session.userId = user._id?.toString();
    req.session.userId = user._id?.toString();

    const sessionId = req.sessionID;

    console.log({ session: req.session });
    console.log({ sessionId });

    const sessionKey = `sess:${sessionId}`;

    const sessionData = await redisClient.get(sessionKey);

    console.log({
      sessionData: JSON.parse(sessionData!!),
    });

    // generateTokenAndSetCookie(res, user._id as string);

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
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res
        .status(500)
        .json({ success: false, message: "Error logging out" });
    }

    // Clear the session cookie
    res.clearCookie("connect.sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    // Respond to the client
    res.status(200).json({ success: true, message: "Logged out successfully" });
  });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = resetTokenExpiresAt;

    console.log(resetToken);

    sendEmail(user.email, "Forgot Password", "passwordReset", {
      resetURL: `http://localhost:3000/password-reset/${resetToken}`,
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset link have been sent to your mailbox",
    });
  } catch (error) {
    console.error("Error in forgotPassword: ", error);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { resetToken } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    resetPasswordToken: resetToken,
    // resetTokenExpiresAt: { $gt: Date.now() },
  });

  console.log(user);

  if (!user) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid password reset token" });
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiresAt = undefined;
  await user.save();

  res.status(200).json({ success: true, message: "Password updated" });
};

export const verifyToken = async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token)
    return res
      .status(400)
      .json({ success: false, message: "Token is required" });

  try {
    const decoded: any = jwt.verify(token.value, process.env.JWT_SECRET!!);
    const user = await User.findById(decoded.userId);

    if (user?.isVerified) {
      res.status(200).json({ success: true, user: decoded });
    } else {
      res
        .status(200)
        .json({ success: false, message: " User is not verified" });
    }
  } catch (error: any) {
    console.error(error.message);
    return;
  }
};

export const getMe = async (req: Request, res: Response) => {
  VerifyToken(req, res, (result) => {
    if (!result.success) {
      return res
        .status(result.message === "Token is required" ? 400 : 403)
        .json({ success: false, message: result.message });
    }

    // Respond with the user data if everything is fine
    res.status(200).json({ success: true, user: result.user });
  });
};
