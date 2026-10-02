const Notification = require("../models/notification");

// Create notification
const createNotification = async (req, res) => {
  try {
    const {
      user,
      type,
      title,
      message,
      relatedId,
    } = req.body;

    if (!user || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "User, title and message are required",
      });
    }

    const notification =
      await Notification.create({
        user,
        type: type || "system",
        title,
        message,
        relatedId: relatedId || "",
      });

    return res.status(201).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error(
      "Create notification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create notification",
    });
  }
};

// Get my notifications
const getNotifications = async (req, res) => {
  try {
    const notifications =
      await Notification.find({
        user: req.user._id,
      })
        .sort({ createdAt: -1 })
        .limit(50);

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error(
      "Get notifications error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

// Mark one notification as read
const markNotificationRead = async (
  req,
  res
) => {
  try {
    const notification =
      await Notification.findOne({
        _id: req.params.notificationId,
        user: req.user._id,
      });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.read = true;

    await notification.save();

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error(
      "Mark notification read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update notification",
    });
  }
};

// Mark all notifications as read
const markAllNotificationsRead = async (
  req,
  res
) => {
  try {
    await Notification.updateMany(
      {
        user: req.user._id,
        read: false,
      },
      {
        $set: {
          read: true,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error(
      "Mark all notifications read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update notifications",
    });
  }
};

module.exports = {
  createNotification,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};