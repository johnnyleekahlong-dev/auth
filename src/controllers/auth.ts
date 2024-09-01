import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { sendEmail } from '../nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Extend SessionData directly in the file
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    isAuth: boolean;
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
      return res.status(400).json({ msg: 'User already exists' });
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

    // const resp = sendEmail(email, 'Account Verification', 'verify', {
    //   username: name.toUpperCase(),
    //   verificationCode,
    // });

    await sendEmail(
      email,
      'Account Verification',
      'This is the plain text content.',
      `<h1>Hello ${user.name}</h1><p>This is your verification code: ${verificationCode}.</p>`
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
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
        message: 'Invalid or expired verification code',
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    // sendEmail(user.email, 'Welcome Onboard', 'welcome', {
    //   username: user.name,
    // });

    res.status(200).json({
      success: true,
      message: 'Account verified successfully',
    });
  } catch (error) {
    console.log('Error in verifyAccount ', error);
    res.status(500).json({ success: false, message: 'Server error' });
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
        .json({ success: false, message: 'Invalid credentials' });
    }

    if (!user) return;

    if (!user.isVerified)
      return res
        .status(400)
        .json({ sucesss: false, message: 'Account verification required' });

    user.lastLogin = new Date();

    await user?.save();

    const sessionId = req.session.id;
    req.session.isAuth = true;
    req.session.userId = user._id?.toString();

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
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
      console.error('Error destroying session:', err);
      return res
        .status(500)
        .json({ success: false, message: 'Error logging out' });
    }

    // Clear the session cookie
    res.clearCookie('connect.sid', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    // Respond to the client
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    const resetTokenExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hr

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = resetTokenExpiresAt;

    // sendEmail(user.email, 'Forgot Password', 'passwordReset', {
    //   username: user.name,
    //   resetURL: `${process.env.FRONTEND_RESET_PASSWORD_LINK}/${resetToken}`,
    // });

    console.log(`http://localhost:9000/auth/reset-password/${resetToken}`);

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset link have been sent to your mailbox',
    });
  } catch (error) {
    console.error('Error in forgotPassword: ', error);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { resetToken } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    resetPasswordToken: resetToken,
  });

  if (!user) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid password reset token' });
  }

  if (
    user &&
    user.resetPasswordExpiresAt &&
    user.resetPasswordExpiresAt > new Date()
  ) {
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();
    res.status(200).json({ success: true, message: 'Password updated' });
  } else {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid password reset token' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  const user = await User.findById(req.session.userId);

  res.status(200).json({ success: true, user });
};
