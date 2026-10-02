const express = require("express");

const {
  createMeeting,
  getMeetings,
  getMeetingByRoomId,
  getHistoricalMeetingByRoomId,
  cancelMeeting,
  getMeetingHistory,
  deleteMeeting,
} = require("../controllers/meetingController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Create meeting
router.post("/", protect, createMeeting);

// Get all user's meetings
router.get("/", protect, getMeetings);
router.delete("/:id", protect, deleteMeeting);

// Get meeting history
router.get(
  "/history",
  protect,
  getMeetingHistory
);

// Get historical meeting details
router.get(
  "/history/:roomId",
  protect,
  getHistoricalMeetingByRoomId
);

// Get single active meeting
router.get(
  "/:roomId",
  protect,
  getMeetingByRoomId
);

// Cancel meeting
router.put(
  "/:roomId/cancel",
  protect,
  cancelMeeting
);

module.exports = router;