const express = require("express");

const {
  createActionItem,
  getActionItems,
  updateActionItem,
  deleteActionItem,
} = require("../controllers/actionItemController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Create action item
router.post(
  "/meeting/:roomId",
  protect,
  createActionItem
);

// Get action items
router.get(
  "/meeting/:roomId",
  protect,
  getActionItems
);

// Update action item
router.put(
  "/:actionItemId",
  protect,
  updateActionItem
);

// Delete action item
router.delete(
  "/:actionItemId",
  protect,
  deleteActionItem
);

module.exports = router;