const Summary = require("../models/summary");
const Transcript = require("../models/transcript");
const Meeting = require("../models/meeting");
const ActionItem = require("../models/actionItem");
const User = require("../models/user");
const Notification = require("../models/notification");

const {
  generateMeetingInsights,
} = require("../services/geminiService");

// ==========================================
// GENERATE NEW AI INSIGHTS AND SAVE THEM
// ==========================================

const generateInsights = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required",
      });
    }

    // ==========================================
    // FIND MEETING
    // ==========================================

    const meeting = await Meeting.findOne({
      roomId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // ==========================================
    // HOST ACCESS ONLY
    // ==========================================

    const isHost =
      meeting.host &&
      meeting.host.toString() ===
        req.user._id.toString();

    if (!isHost) {
      return res.status(403).json({
        success: false,
        message:
          "Only the meeting host can access AI Meeting Insights",
      });
    }

    // ==========================================
    // GET TRANSCRIPT
    // ==========================================

    const transcripts = await Transcript.find({
      meetingRoomId: roomId,
    }).sort({
      timestamp: 1,
    });

    if (!transcripts.length) {
      return res.status(400).json({
        success: false,
        message:
          "No transcript available for this meeting",
      });
    }

    // ==========================================
    // CONVERT TRANSCRIPT TO TEXT
    // ==========================================

    const transcriptText = transcripts
      .map(
        (item) =>
          `${item.speaker}: ${item.text}`
      )
      .join("\n");

    // ==========================================
    // GENERATE GEMINI INSIGHTS
    // ==========================================

    const insights =
      await generateMeetingInsights(
        transcriptText
      );

    // ==========================================
    // SAVE OR UPDATE AI SUMMARY
    // ==========================================

    const savedSummary =
      await Summary.findOneAndUpdate(
        {
          meetingRoomId: roomId,
        },
        {
          meeting: meeting._id,
          generatedBy: req.user._id,
          summary: insights.summary || "",
          keyPoints:
            insights.keyPoints || [],
          decisions:
            insights.decisions || [],
          actionItems:
            insights.actionItems || [],
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      );

    console.log(
      "AI summary saved:",
      savedSummary._id
    );

    // ==========================================
    // GET OLD ACTION ITEMS
    // ==========================================

    const oldActionItems =
      await ActionItem.find({
        meetingRoomId: roomId,
      }).select("_id");

    const oldActionItemIds =
      oldActionItems.map((item) =>
        item._id.toString()
      );

    // ==========================================
    // REMOVE OLD ACTION ITEM NOTIFICATIONS
    // ==========================================

    if (oldActionItemIds.length > 0) {
      await Notification.deleteMany({
        type: "action-item",
        relatedId: {
          $in: oldActionItemIds,
        },
      });

      console.log(
        `Removed ${oldActionItemIds.length} old action item notification reference(s)`
      );
    }

    // ==========================================
    // REMOVE PREVIOUS ACTION ITEMS
    // ==========================================

    await ActionItem.deleteMany({
      meetingRoomId: roomId,
    });

    // ==========================================
    // SAVE NEW AI-GENERATED ACTION ITEMS
    // ==========================================

    if (
      Array.isArray(insights.actionItems) &&
      insights.actionItems.length > 0
    ) {
      const actionItems =
        insights.actionItems.map(
          (item) => ({
            meetingRoomId: roomId,
            meeting: meeting._id,
            task: item.task || "",
            assignee:
              item.assignee || "Unassigned",
            priority:
              item.priority || "medium",
            status: "pending",
            createdBy: req.user._id,
          })
        );

      // Save action items
      const savedActionItems =
        await ActionItem.insertMany(
          actionItems
        );

      console.log(
        `Saved ${savedActionItems.length} action item(s)`
      );

      // ==========================================
      // CREATE ACTION ITEM NOTIFICATIONS
      // ==========================================

      for (
        let i = 0;
        i < savedActionItems.length;
        i++
      ) {
        const actionItem =
          savedActionItems[i];

        const assignee =
          actionItem.assignee;

        // Ignore unassigned items
        if (
          !assignee ||
          assignee
            .trim()
            .toLowerCase() ===
            "unassigned"
        ) {
          continue;
        }

        // Find user by name
        const assignedUser =
          await User.findOne({
            name: {
              $regex: `^${assignee
                .trim()
                .replace(
                  /[.*+?^${}()|[\]\\]/g,
                  "\\$&"
                )}$`,
              $options: "i",
            },
          });

        if (!assignedUser) {
          console.log(
            "Assigned user not found:",
            assignee
          );

          continue;
        }

        // Create notification
        const notification =
          await Notification.create({
            user: assignedUser._id,
            type: "action-item",
            title: "New Action Item",
            message: `You have been assigned the task "${actionItem.task}" in the meeting "${meeting.title}".`,
            relatedId:
              actionItem._id.toString(),
          });

        console.log(
          "Action item notification created:",
          notification
        );
      }
    } else {
      console.log(
        "No action items generated by Gemini"
      );
    }

    // ==========================================
    // RETURN RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      roomId,
      insights: savedSummary,
    });
  } catch (error) {
    console.error(
      "Generate AI insights error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate meeting insights",
      error: error.message,
    });
  }
};

// ==========================================
// GET PREVIOUSLY SAVED AI INSIGHTS
// ==========================================

const getSavedInsights = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required",
      });
    }

    // Find meeting
    const meeting = await Meeting.findOne({
      roomId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Check if current user is the host
    const isHost =
      meeting.host &&
      meeting.host.toString() ===
        req.user._id.toString();

    // Check if current user is a participant
    const isParticipant =
      Array.isArray(meeting.participants) &&
      meeting.participants.some(
        (participant) =>
          participant.toString() ===
          req.user._id.toString()
      );
    console.log("AI Insights access check:", {
  userId: req.user._id.toString(),
  hostId: meeting.host?.toString(),
  participantIds: meeting.participants?.map((p) =>
    p.toString()
  ),
  isHost,
  isParticipant,
});
    // Host OR participant can view saved insights
    if (!isHost && !isParticipant) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view this meeting's AI insights",
      });
    }

    // Get saved AI summary
    const savedSummary = await Summary.findOne({
      meetingRoomId: roomId,
    });

    if (!savedSummary) {
      return res.status(404).json({
        success: false,
        message:
          "AI insights have not been generated yet",
      });
    }

    return res.status(200).json({
      success: true,
      roomId,
      insights: savedSummary,
    });
  } catch (error) {
    console.error(
      "Get saved AI insights error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch saved AI insights",
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  generateInsights,
  getSavedInsights,
};