import { Request, Response } from 'express';
import crypto from 'crypto';
import User from '../models/User';
import { sendEmail } from '../nodemailer';
import {
  verify,
  welcome,
  resetPassword as reset,
} from '../nodemailer/template';
import { dispatchWebhookEvent } from '../webhooks';

// POST /admin/users  { name, email, password, role? }
// Unlike /auth/register, this is meant for an admin adding someone
// directly — it skips the email-verification step (isVerified: true) and
// lets the admin set a role up front. If password is omitted, a random
// one is generated so the account exists but can't be signed into until
// the person resets it (wire this up to your forgot-password email flow
// if you want to invite people this way instead of handing out passwords).
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email) {
      return res
        .status(400)
        .json({ success: false, message: 'name and email are required' });
    }

    if (role !== undefined && !['user', 'admin'].includes(role)) {
      return res
        .status(400)
        .json({ success: false, message: "role must be 'user' or 'admin'" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with that email already exists',
      });
    }

    const finalPassword = password || crypto.randomBytes(16).toString('hex');

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const hashedCode = crypto
      .createHash('sha256')
      .update(verificationCode)
      .digest('hex');

    const user = new User({
      name,
      email,
      password: finalPassword,
      role: role || 'user',
      isVerified: false,
      verificationTokenHash: hashedCode,
      verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
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
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        lastLogin: user.lastLogin,
        createdAt: (user as any).createdAt,
      },
      // Only returned when we generated one — the admin needs to pass it
      // along (or trigger a reset) since it's never stored or logged in
      // plain text anywhere past this point.
      ...(password ? {} : { generatedPassword: finalPassword }),
    });
  } catch (error: any) {
    console.error('Error in createUser:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET /admin/users?page=1&limit=20&search=jane
export const listUsers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || '20'), 10), 1),
      100,
    );
    const search = String(req.query.search || '').trim();

    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('_id name email role isVerified lastLogin createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error: any) {
    console.error('Error in listUsers:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET /admin/users/:id
export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select(
      '_id name email role isVerified lastLogin createdAt',
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, user });
  } catch (error: any) {
    console.error('Error in getUser:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// PATCH /admin/users/:id  { role?, isVerified? }
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { role, isVerified } = req.body;
    const targetId = req.params.id;

    if (role !== undefined && !['user', 'admin'].includes(role)) {
      return res
        .status(400)
        .json({ success: false, message: "role must be 'user' or 'admin'" });
    }

    // An admin can't demote themselves through this endpoint — otherwise
    // the last admin could lock themselves out with no way back in
    // short of touching the DB directly.
    if (
      role === 'user' &&
      req.session.user &&
      req.session.user.id === targetId
    ) {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove your own admin access',
      });
    }

    const update: Record<string, unknown> = {};
    if (role !== undefined) update.role = role;
    if (isVerified !== undefined) update.isVerified = Boolean(isVerified);

    const user = await User.findByIdAndUpdate(targetId, update, {
      new: true,
    }).select('_id name email role isVerified lastLogin createdAt');

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, user });
  } catch (error: any) {
    console.error('Error in updateUser:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// DELETE /admin/users/:id
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const targetId = req.params.id;

    if (req.session.user && req.session.user.id === targetId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account here',
      });
    }

    const user = await User.findByIdAndDelete(targetId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    await dispatchWebhookEvent('user.deleted', {
      authUserId: user._id!.toString(),
      source: 'admin-triggered',
    });

    return res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error: any) {
    console.error('Error in deleteUser:', error.message);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};
