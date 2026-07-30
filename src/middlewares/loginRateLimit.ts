// middleware/loginRateLimit.ts

import { Request, Response, NextFunction } from 'express';
import { loginLimiter } from '../utils/rateLimiter';

export async function loginRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.',
      });
    }
    const key = `${req.ip}:${email}`;
    await loginLimiter.consume(key);
    next();
  } catch {
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again later.',
    });
  }
}
