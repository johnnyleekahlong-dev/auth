import express from 'express';
import {
  register,
  login,
  logout,
  verifyAccount,
  getMe,
  resetPassword,
  forgotPassword,
} from '../controllers/auth';
import { isAuth } from '../middlewares/isAuth';
// import { loginRateLimit } from '../middlewares/loginRateLimit';
import { loginLimiter, verifyLimiter } from '../utils/rateLimiter';

const router = express.Router();

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/verify-account/:verificationCode', verifyLimiter, verifyAccount);
router.get('/get-me', isAuth, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:resetToken', resetPassword);

export default router;
