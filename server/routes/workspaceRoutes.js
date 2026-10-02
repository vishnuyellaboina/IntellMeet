const express = require("express");

const {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  addMember,
  removeMember,
  deleteWorkspace,
  uploadWorkspaceFile,
  getWorkspaceFiles,
  deleteWorkspaceFile,
} = require("../controllers/workspaceController");

const protect = require("../middleware/authMiddleware");
const workspaceUpload = require("../middleware/workspaceUpload");

const router = express.Router();

// Create workspace
router.post("/", protect, createWorkspace);

// Get user's workspaces
router.get("/", protect, getMyWorkspaces);

// Upload workspace file
router.post(
  "/:workspaceId/files",
  protect,
  workspaceUpload.single("file"),
  uploadWorkspaceFile
);

// Get workspace files
router.get(
  "/:workspaceId/files",
  protect,
  getWorkspaceFiles
);

// Delete workspace file
router.delete(
  "/:workspaceId/files/:fileId",
  protect,
  deleteWorkspaceFile
);

// Delete workspace
router.delete(
  "/:workspaceId",
  protect,
  deleteWorkspace
);

// Get single workspace
router.get(
  "/:workspaceId",
  protect,
  getWorkspace
);

// Add member
router.post(
  "/:workspaceId/members",
  protect,
  addMember
);

// Remove member
router.delete(
  "/:workspaceId/members/:userId",
  protect,
  removeMember
);

module.exports = router;