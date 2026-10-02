const ActionItem = require("../models/actionItem");
const Meeting = require("../models/meeting");
const User = require("../models/user");
const Notification = require("../models/notification");

// ==========================================
// CREATE AN ACTION ITEM
// ==========================================

const createActionItem = async (req, res) => {
  try {
    const { roomId } = req.params;
    const {
      task,
      assignee,
      priority,
      dueDate,
    } = req.body;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required",
      });
    }

    if (!task || !task.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task is required",
      });
    }

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
    // CHECK HOST / PARTICIPANT
    // ==========================================

    const isParticipant =
      meeting.host.toString() ===
        req.user._id.toString() ||
      meeting.participants.some(
        (participant) =>
          participant.toString() ===
          req.user._id.toString()
      );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this meeting",
      });
    }

    // ==========================================
    // CREATE ACTION ITEM
    // ==========================================

    const actionItem = await ActionItem.create({
      meetingRoomId: roomId,
      meeting: meeting._id,
      task: task.trim(),
      assignee:
        assignee?.trim() || "Unassigned",
      priority: priority || "medium",
      createdBy: req.user._id,
      dueDate: dueDate || null,
    });

    // ==========================================
    // CREATE NOTIFICATION FOR ASSIGNED USER
    // ==========================================

    if (
      assignee &&
      assignee.trim() &&
      assignee.trim().toLowerCase() !== "unassigned"
    ) {
      const assignedUser = await User.findOne({
        name: {
          $regex: `^${assignee.trim()}$`,
          $options: "i",
        },
      });

      if (assignedUser) {
        const notification =
          await Notification.create({
            user: assignedUser._id,
            type: "action-item",
            title: "New Action Item",
            message: `You have been assigned the task "${task.trim()}" in the meeting "${meeting.title}".`,
            relatedId: actionItem._id.toString(),
          });

        console.log(
          "Action item notification created:",
          notification
        );
      } else {
        console.log(
          "Assigned user not found:",
          assignee
        );
      }
    }

    return res.status(201).json({
      success: true,
      message:
        "Action item created successfully",
      actionItem,
    });
  } catch (error) {
    console.error(
      "Create action item error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create action item",
    });
  }
};

// ==========================================
// GET ACTION ITEMS FOR A MEETING
// ==========================================

const getActionItems = async (req, res) => {
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
      meeting.host.toString() ===
        req.user._id.toString() ||
      meeting.participants.some(
        (participant) =>
          participant.toString() ===
          req.user._id.toString()
      );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this meeting",
      });
    }

    const actionItems =
      await ActionItem.find({
        meetingRoomId: roomId,
      }).sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      actionItems,
    });
  } catch (error) {
    console.error(
      "Get action items error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch action items",
    });
  }
};

// ==========================================
// UPDATE AN ACTION ITEM
// ==========================================

const updateActionItem = async (req, res) => {
  try {
    const { actionItemId } = req.params;

    const {
      task,
      assignee,
      priority,
      status,
      dueDate,
    } = req.body;

    const actionItem =
      await ActionItem.findById(actionItemId);

    if (!actionItem) {
      return res.status(404).json({
        success: false,
        message: "Action item not found",
      });
    }

    const meeting =
      await Meeting.findById(
        actionItem.meeting
      );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    const userId =
      req.user._id.toString();

    // ==========================================
    // CHECK HOST
    // ==========================================

    const isHost =
      meeting.host.toString() === userId;

    // ==========================================
    // CHECK PARTICIPANT
    // ==========================================

    const isParticipant =
      meeting.participants.some(
        (participant) =>
          participant.toString() === userId
      );

    if (!isHost && !isParticipant) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to modify this action item",
      });
    }

    // ==========================================
    // PARTICIPANT UPDATE
    // ==========================================

    if (!isHost) {
      const assignedUser =
        actionItem.assignee
          ?.trim()
          .toLowerCase();

      const currentUser =
        req.user.name
          ?.trim()
          .toLowerCase();

      const isAssignedParticipant =
        assignedUser &&
        assignedUser !== "unassigned" &&
        assignedUser === currentUser;

      if (!isAssignedParticipant) {
        return res.status(403).json({
          success: false,
          message:
            "Only the assigned participant can update the work progress",
        });
      }

      // Participant can ONLY update status
      if (
        task !== undefined ||
        assignee !== undefined ||
        priority !== undefined ||
        dueDate !== undefined
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Participants can only update action item status",
        });
      }

      // Validate status
      if (
        status !== undefined &&
        ![
          "pending",
          "in-progress",
          "completed",
        ].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid action item status",
        });
      }

      if (status !== undefined) {
        actionItem.status = status;
      }
    }

    // ==========================================
    // HOST UPDATE
    // ==========================================

    if (isHost) {
      if (task !== undefined) {
        if (!task.trim()) {
          return res.status(400).json({
            success: false,
            message:
              "Task cannot be empty",
          });
        }

        actionItem.task = task.trim();
      }

      if (assignee !== undefined) {
        actionItem.assignee =
          assignee.trim() ||
          "Unassigned";
      }

      if (priority !== undefined) {
        if (
          ![
            "high",
            "medium",
            "low",
          ].includes(priority)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid priority",
          });
        }

        actionItem.priority = priority;
      }

      if (status !== undefined) {
        if (
          ![
            "pending",
            "in-progress",
            "completed",
          ].includes(status)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid action item status",
          });
        }

        actionItem.status = status;
      }

      if (dueDate !== undefined) {
        actionItem.dueDate =
          dueDate || null;
      }
    }

    await actionItem.save();
    // ==========================================
// REAL-TIME ACTION ITEM UPDATE
// ==========================================

const io = req.app.get("io");

if (io) {
  io.to(actionItem.meetingRoomId).emit(
    "action-item-updated",
    actionItem
  );
}

    return res.status(200).json({
      success: true,
      message:
        "Action item updated successfully",
      actionItem,
    });
  } catch (error) {
    console.error(
      "Update action item error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update action item",
    });
  }
};

// ==========================================
// DELETE AN ACTION ITEM
// ==========================================

const deleteActionItem = async (
  req,
  res
) => {
  try {
    const { actionItemId } =
      req.params;

    const actionItem =
      await ActionItem.findById(
        actionItemId
      );

    if (!actionItem) {
      return res.status(404).json({
        success: false,
        message:
          "Action item not found",
      });
    }

    const meeting =
      await Meeting.findById(
        actionItem.meeting
      );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message:
          "Meeting not found",
      });
    }

    // ==========================================
    // ONLY HOST CAN DELETE
    // ==========================================

    const isHost =
      meeting.host.toString() ===
      req.user._id.toString();

    if (!isHost) {
      return res.status(403).json({
        success: false,
        message:
          "Only the meeting host can delete action items",
      });
    }

    await ActionItem.findByIdAndDelete(
      actionItemId
    );

    return res.status(200).json({
      success: true,
      message:
        "Action item deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete action item error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete action item",
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  createActionItem,
  getActionItems,
  updateActionItem,
  deleteActionItem,
};