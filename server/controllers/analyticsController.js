const Meeting = require("../models/meeting");
const ActionItem = require("../models/actionItem");

// ==========================================
// GET DASHBOARD ANALYTICS
// ==========================================

const getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    const meetings = await Meeting.find({
      $or: [
        { host: userId },
        { participants: userId },
      ],
    });

    const actionItems = await ActionItem.find({
      createdBy: userId,
    });

    // ==========================================
    // CALCULATE MEETING STATISTICS
    // ==========================================

    const now = new Date();

    let totalDuration = 0;
    let completedMeetings = 0;
    let cancelledMeetings = 0;

    meetings.forEach((meeting) => {
      // Calculate meeting duration
      if (
        meeting.startTime &&
        meeting.endTime
      ) {
        const start = new Date(
          meeting.startTime
        );

        const end = new Date(
          meeting.endTime
        );

        const duration = Math.max(
          0,
          Math.round(
            (end - start) /
              (1000 * 60)
          )
        );

        totalDuration += duration;
      }

      // Cancelled meetings
      if (
        meeting.status === "cancelled"
      ) {
        cancelledMeetings++;
        return;
      }

      // Completed meetings
      // If endTime has passed, consider
      // the meeting completed.
      if (
        meeting.endTime &&
        now >= new Date(meeting.endTime)
      ) {
        completedMeetings++;
      }
    });

    // ==========================================
    // ACTION ITEM STATISTICS
    // ==========================================

    const pendingActionItems =
      actionItems.filter(
        (item) =>
          item.status === "pending"
      ).length;

    const completedActionItems =
      actionItems.filter(
        (item) =>
          item.status === "completed"
      ).length;

    const inProgressActionItems =
      actionItems.filter(
        (item) =>
          item.status === "in-progress"
      ).length;

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,

      analytics: {
        totalMeetings:
          meetings.length,

        completedMeetings,

        cancelledMeetings,

        totalDurationMinutes:
          totalDuration,

        totalActionItems:
          actionItems.length,

        pendingActionItems,

        completedActionItems,

        inProgressActionItems,
      },
    });
  } catch (error) {
    console.error(
      "Dashboard analytics error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch dashboard analytics",
    });
  }
};

module.exports = {
  getDashboardAnalytics,
};