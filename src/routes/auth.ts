import express from "express";
import {
  register,
  login,
  logout,
  verifyAccount,
  getMe,
  resetPassword,
  forgotPassword,
} from "../controllers/auth";
import { isAuth } from "../middlewares/isAuth";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify-account", verifyAccount);
router.get("/get-me", isAuth, getMe);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:resetToken", resetPassword);

export default router;
