// middleware/loginRateLimit.ts

import { Request, Response, NextFunction } from 'express';
import { loginLimiter } from '../utils/rateLimiter';

export async function loginRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await loginLimiter.consume(req.ip!);

    next();
  } catch {
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again later.',
    });
  }
}
