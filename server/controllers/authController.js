const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const sendEmail = require("../utils/sendEmail");

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ==========================================
// REGISTER
// ==========================================

// ==========================================
// REGISTER - SEND OTP
// ==========================================

const register = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        message: "Name and email are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    // ==========================================
    // EXISTING UNVERIFIED USER
    // ==========================================
    if (existingUser && !existingUser.emailVerified) {
      const otp = generateOTP();

      const otpExpires = new Date(
        Date.now() + 10 * 60 * 1000
      );

      existingUser.name = name.trim();
      existingUser.emailVerificationCode = otp;
      existingUser.emailVerificationExpires = otpExpires;
      existingUser.registrationCompleted = false;

      await existingUser.save();

      try {
        await sendVerificationEmail(
          normalizedEmail,
          otp
        );
      } catch (emailError) {
        console.error(
          "Email sending error:",
          emailError
        );

        return res.status(500).json({
          message:
            "Unable to send verification email. Please try again.",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "A new verification code has been sent to your email.",
        email: normalizedEmail,
      });
    }

    // ==========================================
    // EXISTING VERIFIED USER
    // ==========================================
    if (existingUser && existingUser.emailVerified) {
      return res.status(400).json({
        message:
          "An account with this email already exists.",
      });
    }

    // ==========================================
    // NEW USER
    // ==========================================
    const otp = generateOTP();

    const otpExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    const temporaryPassword = await bcrypt.hash(
      `TEMP_${Date.now()}_${Math.random()}`,
      10
    );

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: temporaryPassword,

      emailVerified: false,

      emailVerificationCode: otp,
      emailVerificationExpires: otpExpires,

      registrationCompleted: false,
    });

    try {
      await sendVerificationEmail(
        normalizedEmail,
        otp
      );
    } catch (emailError) {
      await User.findByIdAndDelete(user._id);

      console.error(
        "Email sending error:",
        emailError
      );

      return res.status(500).json({
        message:
          "Unable to send verification email. Please try again.",
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Verification code sent to your email.",
      email: normalizedEmail,
    });

  } catch (error) {
    console.error(
      "Register error:",
      error
    );

    return res.status(500).json({
      message:
        "Registration failed. Please try again.",
    });
  }
};

// ==========================================
// VERIFY EMAIL
// ==========================================

const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message:
          "Email and verification code are required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        message: "Registration not found.",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        message: "Email is already verified.",
      });
    }

    if (
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      return res.status(400).json({
        message:
          "Verification code has expired.",
      });
    }

    if (
      user.emailVerificationCode !== otp
    ) {
      return res.status(400).json({
        message:
          "Invalid verification code.",
      });
    }

    user.emailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Email verified successfully.",
    });

  } catch (error) {
    console.error(
      "Verify email error:",
      error
    );

    return res.status(500).json({
      message:
        "Email verification failed.",
    });
  }
};

// ==========================================
// COMPLETE REGISTRATION
// ==========================================

const completeRegistration = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email first.",
      });
    }

    if (user.registrationCompleted) {
      return res.status(400).json({
        message: "Registration is already completed.",
      });
    }

    user.password = await bcrypt.hash(
      password,
      10
    );

    user.registrationCompleted = true;

    await user.save();

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Registration completed successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        registrationCompleted:
          user.registrationCompleted,
      },
    });

  } catch (error) {
    console.error(
      "Complete registration error:",
      error
    );

    return res.status(500).json({
      message: "Unable to complete registration.",
    });
  }
};

// ==========================================
// RESEND VERIFICATION CODE
// ==========================================

const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        message: "Email is already verified.",
      });
    }

    const otp = generateOTP();

    const otpExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    user.emailVerificationCode = otp;
    user.emailVerificationExpires = otpExpires;

    await user.save();

    try {
      await sendEmail(
        normalizedEmail,
        otp
      );
    } catch (emailError) {
      console.error(
        "Resend email error:",
        emailError
      );

      return res.status(500).json({
        message:
          "Unable to send verification email. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "A new verification code has been sent.",
    });

  } catch (error) {
    console.error(
      "Resend verification error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to resend verification code.",
    });
  }
};

// ==========================================
// LOGIN
// ==========================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        message:
          "Please verify your email before logging in.",
        emailVerificationRequired: true,
        email: user.email,
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });

  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      message:
        "Login failed. Please try again.",
    });
  }
};

// ==========================================
// FORGOT PASSWORD - SEND OTP
// ==========================================

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        message:
          "No account found with this email address.",
      });
    }

    const otp = generateOTP();

    user.passwordResetCode = otp;
    user.passwordResetExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await user.save();

    try {
      await sendEmail(
        normalizedEmail,
        otp
      );
    } catch (emailError) {
      console.error(
        "Password reset email error:",
        emailError
      );

      user.passwordResetCode = null;
      user.passwordResetExpires = null;

      await user.save();

      return res.status(500).json({
        message:
          "Unable to send password reset email. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Verification code sent to your email.",
    });

  } catch (error) {
    console.error(
      "Forgot password error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to process password reset request.",
    });
  }
};

// ==========================================
// RESEND PASSWORD RESET OTP
// ==========================================

const resendResetOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        message:
          "No account found with this email address.",
      });
    }

    // Generate completely new OTP
    const otp = generateOTP();

    // New OTP valid for 10 minutes
    user.passwordResetCode = otp;
    user.passwordResetExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await user.save();

    try {
      // Use the same working email function
      // that sends your registration OTP
      await sendEmail(
        normalizedEmail,
        otp
      );
    } catch (emailError) {
      console.error(
        "Resend password reset email error:",
        emailError
      );

      return res.status(500).json({
        message:
          "Unable to send the new verification code. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "A new verification code has been sent to your email.",
    });

  } catch (error) {
    console.error(
      "Resend reset OTP error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to resend verification code.",
    });
  }
};

// ==========================================
// VERIFY PASSWORD RESET OTP
// ==========================================

const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message:
          "Email and verification code are required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        message: "Account not found.",
      });
    }

    if (!user.passwordResetCode) {
      return res.status(400).json({
        message:
          "No password reset request found.",
      });
    }

    if (
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      return res.status(400).json({
        message:
          "Verification code has expired.",
      });
    }

    if (user.passwordResetCode !== otp) {
      return res.status(400).json({
        message:
          "Invalid verification code.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Email verified successfully.",
    });

  } catch (error) {
    console.error(
      "Verify reset OTP error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to verify verification code.",
    });
  }
};

// ==========================================
// RESET PASSWORD
// ==========================================

const resetPassword = async (req, res) => {
  try {
    const {
      email,
      otp,
      password,
    } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({
        message:
          "Email, OTP and new password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message:
          "Password must contain at least 6 characters.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        message: "Account not found.",
      });
    }

    if (
      !user.passwordResetCode ||
      !user.passwordResetExpires
    ) {
      return res.status(400).json({
        message:
          "No valid password reset request found.",
      });
    }

    if (
      user.passwordResetExpires < new Date()
    ) {
      return res.status(400).json({
        message:
          "Verification code has expired.",
      });
    }

    if (user.passwordResetCode !== otp) {
      return res.status(400).json({
        message:
          "Invalid verification code.",
      });
    }

    user.password = await bcrypt.hash(
      password,
      10
    );

    user.passwordResetCode = null;
    user.passwordResetExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully.",
    });

  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to reset password.",
    });
  }
};

// ==========================================
// GET ME
// ==========================================

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -emailVerificationCode -emailVerificationExpires"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json(user);

  } catch (error) {
    console.error(
      "Get me error:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch user.",
    });
  }
};

// ==========================================
// UPDATE PROFILE
// ==========================================

const updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (name !== undefined) {
      user.name = name.trim();
    }

    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });

  } catch (error) {
    console.error(
      "Update profile error:",
      error
    );

    return res.status(500).json({
      message: "Failed to update profile.",
    });
  }
};

// ==========================================
// CHANGE PASSWORD
// ==========================================

const changePassword = async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword,
    } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message:
          "Current password and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message:
          "New password must contain at least 6 characters.",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const passwordMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!passwordMatch) {
      return res.status(400).json({
        message: "Current password is incorrect.",
      });
    }

    user.password = await bcrypt.hash(
      newPassword,
      10
    );

    await user.save();

    return res.status(200).json({
      message: "Password changed successfully.",
    });

  } catch (error) {
    console.error(
      "Change password error:",
      error
    );

    return res.status(500).json({
      message: "Failed to change password.",
    });
  }
};

// ==========================================
// DELETE ACCOUNT
// ==========================================

const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User account not found.",
      });
    }

    await User.findByIdAndDelete(req.user.id);

    return res.status(200).json({
      success: true,
      message:
        "Your account has been permanently deleted.",
    });

  } catch (error) {
    console.error(
      "Delete account error:",
      error
    );

    return res.status(500).json({
      message: "Failed to delete your account.",
    });
  }
};

module.exports = {
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
};