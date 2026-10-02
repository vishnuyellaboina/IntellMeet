const mongoose = require("mongoose");

const actionItemSchema = new mongoose.Schema(
  {
    meetingRoomId: {
      type: String,
      required: true,
      index: true,
    },

    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },

    task: {
      type: String,
      required: true,
      trim: true,
    },

    assignee: {
      type: String,
      default: "Unassigned",
      trim: true,
    },

    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dueDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "ActionItem",
  actionItemSchema
);