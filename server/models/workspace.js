const mongoose = require("mongoose");

const workspaceMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: {
      type: [workspaceMemberSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Workspace",
  workspaceSchema
);