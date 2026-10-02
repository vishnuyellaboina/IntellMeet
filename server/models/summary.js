const mongoose = require("mongoose");

const actionItemSchema = new mongoose.Schema(
  {
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
  },
  { _id: false }
);

const summarySchema = new mongoose.Schema(
  {
    meetingRoomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    summary: {
      type: String,
      default: "",
      trim: true,
    },

    keyPoints: {
      type: [String],
      default: [],
    },

    decisions: {
      type: [String],
      default: [],
    },

    actionItems: {
      type: [actionItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Summary", summarySchema);