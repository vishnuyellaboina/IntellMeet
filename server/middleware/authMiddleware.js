const jwt = require("jsonwebtoken");
const User = require("../models/user");

const protect = async (req, res, next) => {
  try {
    // Get Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Token required.",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Token missing.",
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    console.log("JWT decoded:", decoded);

    // Get user ID from token
    const userId = decoded.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. User ID missing.",
      });
    }

    // Find user
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    // Attach authenticated user to request
    req.user = user;

    console.log("Authenticated user:", {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    });

    next();

  } catch (error) {
    console.error(
      "Authentication error:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

module.exports = protect;