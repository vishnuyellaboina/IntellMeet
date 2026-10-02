const express = require("express");

const {
  getDashboardAnalytics,
} = require("../controllers/analyticsController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/dashboard",
  protect,
  getDashboardAnalytics
);

module.exports = router;