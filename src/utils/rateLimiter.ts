// // middleware/rateLimiter.ts

// import { RateLimiterRedis } from 'rate-limiter-flexible';
// import { redisClient } from './redis';

// export const loginLimiter = new RateLimiterRedis({
//   storeClient: redisClient,

//   keyPrefix: 'login_fail',

//   points: 5, // 5 attempts

//   duration: 60 * 15, // per 15 minutes

//   blockDuration: 60 * 30, // block for 30 minutes
// });

// export const forgotPasswordLimiter = new RateLimiterRedis({
//   storeClient: redisClient,

//   keyPrefix: 'forgot_password',

//   points: 3,

//   duration: 60 * 60,
// });

// export const registerLimiter = new RateLimiterRedis({
//   storeClient: redisClient,

//   keyPrefix: 'register',

//   points: 5,

//   duration: 60 * 60,
// });

import rateLimit from 'express-rate-limit';
import MongoStore from 'mongo-rate-limit-store';

// rate-limit-mongo (the more commonly-suggested package) implements the
// OLD callback-based Store interface (incr/decrement/resetKey) and hasn't
// been published since 2021 — it's not actually compatible with current
// express-rate-limit versions, which call an async increment(). This
// package targets the current interface (peerDependency: express-rate-limit
// >= 6) and ships its own TypeScript types, so no @types package or manual
// .d.ts declaration is needed either.
//
// In-memory limiters (a plain Map, etc.) only work on a single process —
// the moment this runs on more than one instance, each has its own
// separate counters, so the actual limit a user experiences becomes
// (configured limit) x (number of instances). This reuses the same
// MongoDB you're already running the session store on.

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP+email per window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // a successful login doesn't count against the limit
  keyGenerator: (req) => {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    return `${req.ip}:${email}`;
  },
  message: {
    success: false,
    message: 'Too many login attempts. Try again in a few minutes.',
  },
  store: new MongoStore({
    uri: process.env.MONGODB_URI!,
    collectionName: 'rateLimits',
    prefix: 'rl_login_',
    windowMs: 15 * 60 * 1000,
    clientOptions: {},
  }),
});

// The 6-digit verification code has only 1,000,000 possibilities and the
// hash doesn't slow down guessing (SHA-256 is fast by design) — without
// this, the 24-hour expiry window is the only thing standing between an
// attacker and brute-forcing it.
export const verifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip as string,
  message: {
    success: false,
    message: 'Too many verification attempts. Try again later.',
  },
  store: new MongoStore({
    uri: process.env.MONGODB_URI!,
    collectionName: 'rateLimits',
    prefix: 'rl_verify_',
    windowMs: 60 * 60 * 1000,
    clientOptions: {},
  }),
});
