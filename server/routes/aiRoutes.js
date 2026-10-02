const express = require("express");

const {
  generateInsights,
  getSavedInsights,
} = require("../controllers/aiController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Generate new AI insights
router.get(
  "/meeting/:roomId",
  protect,
  generateInsights
);

// Get previously saved AI insights
router.get(
  "/meeting/:roomId/saved",
  protect,
  getSavedInsights
);

module.exports = router;