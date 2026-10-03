const crypto = require("crypto");
const Meeting = require("../models/meeting");
const Notification = require("../models/notification");

// ==========================================
// CREATE MEETING
// ==========================================
const createMeeting = async (req, res) => {
  try {
    const { title, description, startTime, endTime } = req.body;

    if (!title || !startTime) {
      return res.status(400).json({
        success: false,
        message: "Title and start time are required",
      });
    }

    const startDate = new Date(startTime);

    if (isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid start time",
      });
    }

    if (startDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Meeting start time must be in the future",
      });
    }

    let endDate;

    if (endTime) {
      endDate = new Date(endTime);

      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid end time",
        });
      }

      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: "End time must be after start time",
        });
      }
    }

    const roomId = crypto.randomBytes(6).toString("hex");

    const meeting = await Meeting.create({
      title,
      description: description || "",
      host: req.user._id,
      participants: [req.user._id],
      roomId,
      startTime: startDate,
      endTime: endDate,
      status: "scheduled",
    });

    await Notification.create({
      user: req.user._id,
      type: "meeting",
      title: "Meeting Scheduled",
      message: `Your meeting "${title}" has been scheduled successfully.`,
      relatedId: roomId,
    });

    res.status(201).json({
      success: true,
      message: "Meeting created successfully",
      meeting,
    });
  } catch (error) {
    console.error("Create meeting error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create meeting",
    });
  }
};

// ==========================================
// GET ALL USER MEETINGS
// ==========================================
const getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({
      $or: [
        { host: req.user._id },
        { participants: req.user._id },
      ],
    })
      .populate("host", "name email")
      .populate("participants", "name email")
      .sort({ startTime: -1 });

    const now = new Date();

    const updatedMeetings = meetings.map((meeting) => {
      let status = meeting.status;

      // Do not automatically change cancelled meetings
      if (status !== "cancelled") {
        if (meeting.endTime && now >= meeting.endTime) {
          status = "completed";
        } else if (now >= meeting.startTime) {
          status = "live";
        } else {
          status = "scheduled";
        }
      }

      return {
        ...meeting.toObject(),
        status,
      };
    });

    res.status(200).json({
      success: true,
      meetings: updatedMeetings,
    });
  } catch (error) {
    console.error("Get meetings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch meetings",
    });
  }
};

// ==========================================
// GET SINGLE MEETING
// ==========================================
const getMeetingByRoomId = async (req, res) => {
  try {
    const { roomId } = req.params;

    const meeting = await Meeting.findOne({ roomId });

    // ==========================================
    // INVALID MEETING ID
    // ==========================================
    if (!meeting) {
      return res.status(404).json({
        success: false,
        expired: true,
        type: "invalid",
        message:
          "This Meeting ID is invalid or does not exist.",
      });
    }

    const now = new Date();

    // ==========================================
    // COMPLETED MEETING - EXPIRED ROOM ID
    // ==========================================
    if (
      meeting.status !== "cancelled" &&
      meeting.endTime &&
      now >= new Date(meeting.endTime)
    ) {
      return res.status(410).json({
        success: false,
        expired: true,
        type: "completed",
        message:
          "This meeting has already ended. The Meeting ID is no longer active.",
      });
    }

    // ==========================================
    // ALREADY MARKED COMPLETED
    // ==========================================
    if (meeting.status === "completed") {
      return res.status(410).json({
        success: false,
        expired: true,
        type: "completed",
        message:
          "This meeting has already ended. The Meeting ID is no longer active.",
      });
    }
    
    // ==========================================
    // CANCELLED MEETING
    // ==========================================
    if (meeting.status === "cancelled") {
      return res.status(410).json({
        success: false,
        expired: true,
        type: "cancelled",
        message:
          "This meeting has been cancelled and is no longer available.",
      });
    }

    const userId = req.user._id.toString();

    const isHost =
      meeting.host.toString() === userId;

    const isParticipant =
      meeting.participants.some(
        (participant) =>
          participant.toString() === userId
      );

    // ==========================================
    // ADD NEW PARTICIPANT
    // ==========================================
    if (!isHost && !isParticipant) {
      meeting.participants.push(req.user._id);
      await meeting.save();
    }

    // ==========================================
    // POPULATE MEETING DATA
    // ==========================================
    await meeting.populate([
      {
        path: "host",
        select: "name email",
      },
      {
        path: "participants",
        select: "name email",
      },
    ]);

    return res.status(200).json({
      success: true,
      meeting,
    });
  } catch (error) {
    console.error("Get meeting error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch meeting",
    });
  }
};
// ==========================================
// GET HISTORICAL MEETING DETAILS
// ==========================================
const getHistoricalMeetingByRoomId = async (req, res) => {
  try {
    const { roomId } = req.params;

    const meeting = await Meeting.findOne({ roomId })
      .populate("host", "name email avatar")
      .populate("participants", "name email avatar");

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    const userId = req.user._id.toString();

    const hostId =
      meeting.host?._id?.toString() ||
      meeting.host?.toString();

    const isHost = hostId === userId;

    const isParticipant = meeting.participants.some(
      (participant) =>
        participant?._id?.toString() === userId ||
        participant?.toString() === userId
    );

    if (!isHost && !isParticipant) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have access to this meeting history.",
      });
    }

    return res.status(200).json({
      success: true,
      meeting,
    });
  } catch (error) {
    console.error(
      "Get historical meeting details error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch meeting details",
    });
  }
};
// ==========================================
// CANCEL MEETING
// ==========================================
const cancelMeeting = async (req, res) => {
  try {
    const { roomId } = req.params;

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    if (
      meeting.host.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the meeting host can cancel this meeting",
      });
    }

    if (meeting.status === "completed") {
      return res.status(400).json({
        success: false,
        message:
          "Completed meetings cannot be cancelled",
      });
    }

    if (meeting.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "Meeting is already cancelled",
      });
    }

    meeting.status = "cancelled";

    await meeting.save();

    await Notification.create({
      user: req.user._id,
      type: "meeting",
      title: "Meeting Cancelled",
      message: `Your meeting "${meeting.title}" has been cancelled.`,
      relatedId: meeting.roomId,
    });

    res.status(200).json({
      success: true,
      message:
        "Meeting cancelled successfully",
      meeting,
    });
  } catch (error) {
    console.error("Cancel meeting error:", error);

    res.status(500).json({
      success: false,
      message:
        "Failed to cancel meeting",
    });
  }
};

// ==========================================
// GET MEETING HISTORY
// ==========================================
const getMeetingHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const meetings = await Meeting.find({
      $or: [
        { host: userId },
        { participants: userId },
      ],
    })
      .populate("host", "name email avatar")
      .populate(
        "participants",
        "name email avatar"
      )
      .sort({
        startTime: -1,
        updatedAt: -1,
      });

    const now = new Date();

    const history = meetings.map((meeting) => {
      let durationMinutes = 0;

      if (
        meeting.startTime &&
        meeting.endTime
      ) {
        const startTime = new Date(
          meeting.startTime
        );

        const endTime = new Date(
          meeting.endTime
        );

        durationMinutes = Math.max(
          0,
          Math.round(
            (endTime - startTime) /
              (1000 * 60)
          )
        );
      }

      let status = meeting.status;

      // Never change cancelled meetings
      if (status !== "cancelled") {
        if (
          meeting.endTime &&
          now >= new Date(meeting.endTime)
        ) {
          status = "completed";
        } else if (
          meeting.startTime &&
          now >= new Date(meeting.startTime)
        ) {
          status = "live";
        } else {
          status = "scheduled";
        }
      }

      return {
        _id: meeting._id,
        title: meeting.title,
        description: meeting.description,
        roomId: meeting.roomId,
        host: meeting.host,
        participants: meeting.participants,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        durationMinutes,
        status,
        createdAt: meeting.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: history.length,
      meetings: history,
    });
  } catch (error) {
    console.error(
      "Get meeting history error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch meeting history",
    });
  }
};
// ==========================================
// DELETE MEETING
// ==========================================

const deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;

    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found.",
      });
    }

    // Only the meeting host can delete it
    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the meeting host can delete this meeting.",
      });
    }

    await Meeting.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Meeting deleted successfully.",
    });
  } catch (error) {
    console.error("Delete meeting error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete meeting.",
    });
  }
};
module.exports = {
  createMeeting,
  getMeetings,
  getMeetingByRoomId,
  getHistoricalMeetingByRoomId,
  cancelMeeting,
  getMeetingHistory,
  deleteMeeting,
};