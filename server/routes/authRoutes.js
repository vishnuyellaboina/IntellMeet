const express = require("express");

const {
  register,
  login,
  verifyEmail,
  completeRegistration,
  resendVerificationCode,
  forgotPassword,
  resendResetOTP,
  verifyResetOTP,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.post("/verify-email", verifyEmail);

router.post(
  "/complete-registration",
  completeRegistration
);

router.post(
  "/resend-verification",
  resendVerificationCode
);

router.get("/me", protect, getMe);

router.put(
  "/profile",
  protect,
  updateProfile
);

router.put(
  "/change-password",
  protect,
  changePassword
);

router.delete(
  "/account",
  protect,
  deleteAccount
);

router.post(
  "/forgot-password",
  forgotPassword
);

router.post(
  "/resend-reset-otp",
  resendResetOTP
);

router.post(
  "/verify-reset-otp",
  verifyResetOTP
);

router.post(
  "/reset-password",
  resetPassword
);

module.exports = router;