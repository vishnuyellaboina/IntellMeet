const Workspace = require("../models/workspace");
const User = require("../models/user");
const Notification = require("../models/notification");
const WorkspaceFile = require("../models/workspaceFile");

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// ==========================================
// CREATE WORKSPACE
// ==========================================

const createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Workspace name is required",
      });
    }

    const workspace = await Workspace.create({
      name: name.trim(),
      description: description?.trim() || "",
      owner: req.user._id,
      members: [
        {
          user: req.user._id,
          role: "owner",
        },
      ],
    });

    const populatedWorkspace = await Workspace.findById(
      workspace._id
    )
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");

    return res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      workspace: populatedWorkspace,
    });
  } catch (error) {
    console.error("Create workspace error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create workspace",
    });
  }
};

// ==========================================
// GET MY WORKSPACES
// ==========================================

const getMyWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      "members.user": req.user._id,
    })
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      workspaces,
    });
  } catch (error) {
    console.error("Get workspaces error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch workspaces",
    });
  }
};

// ==========================================
// GET SINGLE WORKSPACE
// ==========================================

const getWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const isMember = workspace.members.some(
      (member) =>
        member.user._id.toString() ===
        req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }

    return res.status(200).json({
      success: true,
      workspace,
    });
  } catch (error) {
    console.error("Get workspace error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch workspace",
    });
  }
};

// ==========================================
// ADD MEMBER
// ==========================================

const addMember = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Member email is required",
      });
    }

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const currentMember = workspace.members.find(
      (member) =>
        member.user.toString() ===
        req.user._id.toString()
    );

    if (
      !currentMember ||
      !["owner", "admin"].includes(currentMember.role)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only owners and admins can add members",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User with this email was not found",
      });
    }

    const alreadyMember = workspace.members.some(
      (member) =>
        member.user.toString() ===
        user._id.toString()
    );

    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: "User is already a workspace member",
      });
    }

    workspace.members.push({
      user: user._id,
      role: role === "admin" ? "admin" : "member",
    });

    await workspace.save();

    const notification = await Notification.create({
      user: user._id,
      type: "workspace",
      title: "Added to Workspace",
      message: `You have been added to the workspace "${workspace.name}".`,
      relatedId: workspace._id.toString(),
    });

    console.log(
      "Workspace notification created:",
      notification
    );

    const updatedWorkspace = await Workspace.findById(
      workspace._id
    )
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");

    return res.status(200).json({
      success: true,
      message: "Member added successfully",
      workspace: updatedWorkspace,
    });
  } catch (error) {
    console.error(
      "Add workspace member error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to add workspace member",
    });
  }
};

// ==========================================
// REMOVE MEMBER
// ==========================================

const removeMember = async (req, res) => {
  try {
    const { workspaceId, userId } = req.params;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const currentMember = workspace.members.find(
      (member) =>
        member.user.toString() ===
        req.user._id.toString()
    );

    if (
      !currentMember ||
      !["owner", "admin"].includes(currentMember.role)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only owners and admins can remove members",
      });
    }

    if (
      workspace.owner.toString() === userId
    ) {
      return res.status(400).json({
        success: false,
        message: "Workspace owner cannot be removed",
      });
    }

    const memberExists = workspace.members.some(
      (member) =>
        member.user.toString() === userId
    );

    if (!memberExists) {
      return res.status(404).json({
        success: false,
        message:
          "User is not a member of this workspace",
      });
    }

    workspace.members = workspace.members.filter(
      (member) =>
        member.user.toString() !== userId
    );

    await workspace.save();

    const notification = await Notification.create({
      user: userId,
      type: "workspace",
      title: "Removed from Workspace",
      message: `You have been removed from the workspace "${workspace.name}".`,
      relatedId: workspace._id.toString(),
    });

    console.log(
      "Workspace removal notification created:",
      notification
    );

    const updatedWorkspace = await Workspace.findById(
      workspace._id
    )
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
      workspace: updatedWorkspace,
    });
  } catch (error) {
    console.error(
      "Remove workspace member error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to remove workspace member",
    });
  }
};

// ==========================================
// UPLOAD WORKSPACE FILE
// ==========================================

const uploadWorkspaceFile = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a file",
      });
    }

    const workspace = await Workspace.findById(
      workspaceId
    );

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const isMember = workspace.members.some(
      (member) =>
        member.user.toString() ===
        req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message:
          "You are not a member of this workspace",
      });
    }

    const workspaceFile =
      await WorkspaceFile.create({
        workspace: workspaceId,
        uploadedBy: req.user._id,
        originalName: req.file.originalname,
        fileName: req.file.filename,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });

    const populatedFile =
      await WorkspaceFile.findById(
        workspaceFile._id
      ).populate(
        "uploadedBy",
        "name email avatar"
      );

    return res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      file: populatedFile,
    });
  } catch (error) {
    console.error(
      "Upload workspace file error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to upload file",
    });
  }
};

// ==========================================
// GET WORKSPACE FILES
// ==========================================

const getWorkspaceFiles = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(
      workspaceId
    );

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const isMember = workspace.members.some(
      (member) =>
        member.user.toString() ===
        req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message:
          "You are not a member of this workspace",
      });
    }

    const files = await WorkspaceFile.find({
      workspace: workspaceId,
    })
      .populate(
        "uploadedBy",
        "name email avatar"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      files,
    });
  } catch (error) {
    console.error(
      "Get workspace files error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch workspace files",
    });
  }
};

// ==========================================
// DELETE WORKSPACE FILE
// ==========================================

const deleteWorkspaceFile = async (req, res) => {
  try {
    const {
      workspaceId,
      fileId,
    } = req.params;

    const workspace = await Workspace.findById(
      workspaceId
    );

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const currentMember =
      workspace.members.find(
        (member) =>
          member.user.toString() ===
          req.user._id.toString()
      );

    if (
      !currentMember ||
      !["owner", "admin"].includes(
        currentMember.role
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only owners and admins can delete files",
      });
    }

    const file =
      await WorkspaceFile.findOne({
        _id: fileId,
        workspace: workspaceId,
      });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    if (
      file.filePath &&
      fs.existsSync(file.filePath)
    ) {
      fs.unlinkSync(file.filePath);
    }

    await WorkspaceFile.deleteOne({
      _id: fileId,
    });

    return res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete workspace file error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete file",
    });
  }
};

// ==========================================
// DELETE WORKSPACE
// ==========================================

const deleteWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(
      workspaceId
    );

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    // Only workspace owner can delete
    if (
      workspace.owner.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the workspace owner can delete this workspace",
      });
    }

    // Delete physical workspace files
    const workspaceFiles =
      await WorkspaceFile.find({
        workspace: workspaceId,
      });

    for (const file of workspaceFiles) {
      if (
        file.filePath &&
        fs.existsSync(file.filePath)
      ) {
        fs.unlinkSync(file.filePath);
      }
    }

    // Delete file records
    await WorkspaceFile.deleteMany({
      workspace: workspaceId,
    });

    // Delete workspace
    await Workspace.findByIdAndDelete(
      workspaceId
    );

    return res.status(200).json({
      success: true,
      message: "Workspace deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete workspace error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete workspace",
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  addMember,
  removeMember,
  deleteWorkspace,
  uploadWorkspaceFile,
  getWorkspaceFiles,
  deleteWorkspaceFile,
};