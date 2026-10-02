const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    meetingRoomId: {
      type: String,
      required: true,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    senderName: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Message",
  messageSchema
);