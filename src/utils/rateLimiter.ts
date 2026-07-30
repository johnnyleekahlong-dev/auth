// middleware/rateLimiter.ts

import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisClient } from './redis';

export const loginLimiter = new RateLimiterRedis({
  storeClient: redisClient,

  keyPrefix: 'login_fail',

  points: 5, // 5 attempts

  duration: 60 * 15, // per 15 minutes

  blockDuration: 60 * 30, // block for 30 minutes
});

export const forgotPasswordLimiter = new RateLimiterRedis({
  storeClient: redisClient,

  keyPrefix: 'forgot_password',

  points: 3,

  duration: 60 * 60,
});

export const registerLimiter = new RateLimiterRedis({
  storeClient: redisClient,

  keyPrefix: 'register',

  points: 5,

  duration: 60 * 60,
});
