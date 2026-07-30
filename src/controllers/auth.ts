import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { sendEmail } from '../nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';
import {
  verify,
  welcome,
  resetPassword as reset,
} from '../nodemailer/template';
import { createSession } from '../utils/session';
import { loginLimiter } from '../utils/rateLimiter';

dotenv.config();

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const hashedCode = crypto
      .createHash('sha256')
      .update(verificationCode)
      .digest('hex');

    user = new User({
      name,
      email,
      password,
      verificationTokenHash: hashedCode,
      verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    await user.save();

    if (process.env.NODE_ENV !== 'development') {
      await sendEmail(
        email,
        'Account Verification',
        'This is the plain text content.',
        verify(
          user.name,
          `${process.env.HOST}/auth/verify-account/${verificationCode}`,
        ),
      );
    } else {
      console.log({ verificationCode });
    }

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
    });
  } catch (error: any) {
    console.error(error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const verifyAccount = async (req: Request, res: Response) => {
  const { verificationCode } = req.params;

  const hashedCode = crypto
    .createHash('sha256')
    .update(verificationCode)
    .digest('hex');

  try {
    const user = await User.findOne({
      verificationToken: hashedCode,
      verificationTokenExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code',
      });
    }

    user.isVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    if (process.env.NODE_ENV !== 'development') {
      await sendEmail(
        user.email,
        'Welcome Onboard',
        'This is the plain text content.',
        welcome(user.name),
      );
    }

    await createSession(req, {
      id: user._id!.toString(),
      email: user.email,
      name: user.name,
    });

    return res.status(200).json({
      success: true,
      message: 'Account verified successfully',
    });
  } catch (error) {
    console.log('Error in verifyAccount ', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { email, password, remember } = req.body;
  console.log('remember received:', remember, typeof remember);
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

    await createSession(
      req,
      {
        id: user._id!.toString(),
        email: user.email,
        name: user.name,
      },
      remember,
    );

    loginLimiter.delete(req.ip!);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
    });
  } catch (error: any) {
    console.error(error.message);
    return res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

export const logout = (req: Request, res: Response, next: NextFunction) => {
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
      sameSite: 'none',
      path: '/',
    });

    // Respond to the client
    return res
      .status(200)
      .json({ success: true, message: 'Logged out successfully' });
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

    const hashedResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const resetTokenExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hr

    user.resetPasswordTokenHash = hashedResetToken;
    user.resetPasswordExpiresAt = resetTokenExpiresAt;

    if (process.env.NODE_ENV !== 'development') {
      await sendEmail(
        user.email,
        'Password Reset',
        'This is the plain text content.',
        reset(
          user.name,
          `${process.env.FRONTEND_RESET_PASSWORD_LINK}/${resetToken}`,
        ),
      );
    } else {
      console.log({
        resetLink: `${process.env.FRONTEND_RESET_PASSWORD_LINK}/${resetToken}`,
      });
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset link have been sent to your mailbox',
    });
  } catch (error) {
    console.error('Error in forgotPassword: ', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { resetToken } = req.params;
  const { password } = req.body;

  const hashedResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordTokenHash: hashedResetToken,
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
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();
    return res.status(200).json({ success: true, message: 'Password updated' });
  } else {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid password reset token' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.session.user!.id).select(
      '_id name email role',
    );
    if (user) {
      res.status(200).json({ success: true, user });
      return;
    } else {
      res.status(401).json({
        success: false,
        error_message: 'No user found, please login.',
      });
      return;
    }
  } catch (error: any) {
    console.error(error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};
