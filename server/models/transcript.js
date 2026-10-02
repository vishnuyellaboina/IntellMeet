const mongoose = require("mongoose");

const transcriptSchema = new mongoose.Schema(
  {
    meetingRoomId: {
      type: String,
      required: true,
      index: true,
    },

    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: false,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    speaker: {
      type: String,
      required: true,
      trim: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transcript", transcriptSchema);