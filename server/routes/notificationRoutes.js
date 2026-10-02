const express = require("express");

const {
  createNotification,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createNotification);

router.get("/", protect, getNotifications);

router.put(
  "/:notificationId/read",
  protect,
  markNotificationRead
);

router.put(
  "/read-all",
  protect,
  markAllNotificationsRead
);

module.exports = router;