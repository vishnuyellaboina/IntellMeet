const express = require("express");

const {
  saveTranscript,
  getTranscript,
} = require("../controllers/transcriptController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// SAVE TRANSCRIPT
// POST /api/transcripts
// ==========================================

router.post(
  "/",
  (req, res, next) => {
    console.log("=================================");
    console.log("POST /api/transcripts RECEIVED");
    console.log("Body:", req.body);
    console.log("=================================");

    next();
  },
  protect,
  saveTranscript
);

// ==========================================
// GET TRANSCRIPT
// GET /api/transcripts/:roomId
// ==========================================

router.get("/:roomId", protect, getTranscript);

module.exports = router;