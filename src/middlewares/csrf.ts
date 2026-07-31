import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Routes that establish a session (or don't have one to check against yet)
// are inherently exempt — there's no token to compare, not a hole.
const EXEMPT_PREFIXES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password', // covers /auth/reset-password/:resetToken too
];

function tokensMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on mismatched lengths rather than returning
  // false, so check that first — this length check itself isn't timing-
  // sensitive in any meaningful way, since token length is fixed/known.
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(new Uint8Array(bufA), new Uint8Array(bufB));
}

export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (EXEMPT_PREFIXES.some((prefix) => req.path.startsWith(prefix)))
    return next();

  const headerToken = req.headers['x-csrf-token'];
  const sessionToken = req.session?.csrfToken;

  if (
    !sessionToken ||
    !headerToken ||
    typeof headerToken !== 'string' ||
    !tokensMatch(headerToken, sessionToken)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
  }

  return next();
}
