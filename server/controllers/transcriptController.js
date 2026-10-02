const Transcript = require("../models/transcript");
const Meeting = require("../models/meeting");

// ==========================================
// SAVE TRANSCRIPT
// ==========================================
const saveTranscript = async (req, res) => {
  try {
    const { meetingRoomId, text, speaker } = req.body;

    console.log("=================================");
    console.log("SAVE TRANSCRIPT");
    console.log("Meeting Room:", meetingRoomId);
    console.log("Text:", text);
    console.log("Speaker:", speaker);
    console.log("Authenticated User:", req.user);
    console.log("Authenticated User ID:", req.user?._id);
    console.log("=================================");

    // Validate request
    if (!meetingRoomId || !text) {
      return res.status(400).json({
        success: false,
        message: "Meeting room ID and transcript text are required",
      });
    }

    // Make sure authentication middleware provided a user
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    // Find meeting
    const meeting = await Meeting.findOne({
      roomId: meetingRoomId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Check whether user belongs to meeting
    const isParticipant =
      meeting.host.toString() === req.user._id.toString() ||
      meeting.participants.some(
        (participant) =>
          participant.toString() === req.user._id.toString()
      );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to save transcript for this meeting",
      });
    }

    // Create transcript
    const transcript = await Transcript.create({
      meetingRoomId: meetingRoomId,
      meeting: meeting._id,
      user: req.user._id,
      speaker: speaker || req.user.name,
      text: text.trim(),
      timestamp: new Date(),
    });

    console.log("Transcript saved:", transcript._id);

    return res.status(201).json({
      success: true,
      message: "Transcript saved successfully",
      transcript,
    });

  } catch (error) {
    console.error("Save transcript error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save transcript",
      error: error.message,
    });
  }
};


// ==========================================
// GET MEETING TRANSCRIPT
// ==========================================
const getTranscript = async (req, res) => {
  try {
    const { roomId } = req.params;

    const meeting = await Meeting.findOne({
      roomId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    const isParticipant =
      meeting.host.toString() === req.user._id.toString() ||
      meeting.participants.some(
        (participant) =>
          participant.toString() === req.user._id.toString()
      );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this transcript",
      });
    }

    const transcripts = await Transcript.find({
      meetingRoomId: roomId,
    })
      .populate("user", "name email")
      .sort({ timestamp: 1 });

    return res.status(200).json({
      success: true,
      transcripts,
    });

  } catch (error) {
    console.error("Get transcript error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch transcript",
    });
  }
};


module.exports = {
  saveTranscript,
  getTranscript,
};