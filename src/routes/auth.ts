import express from "express";
import {
  register,
  login,
  logout,
  verifyToken,
  verifyAccount,
  getMe,
} from "../controllers/auth";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify-token", verifyToken);
router.post("/verify-account", verifyAccount);
router.post("/get-me", getMe);

export default router;
