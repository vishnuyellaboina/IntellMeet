const actionItemRoutes = require("./routes/actionItemRoutes");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const aiRoutes = require("./routes/aiRoutes");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const Message = require("./models/message");
const Meeting = require("./models/meeting");
const transcriptRoutes = require("./routes/transcriptRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const path = require("path");

// Socket.IO authentication
const jwt = require("jsonwebtoken");
const User = require("./models/user");

connectDB();

const app = express();
app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(
  "/api/analytics",
  analyticsRoutes
);

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);

app.use("/api/meetings", meetingRoutes);

app.use("/api/transcripts", transcriptRoutes);

app.use("/api/ai", aiRoutes);

app.use("/api/action-items", actionItemRoutes);

app.use("/api/analytics", analyticsRoutes);

app.use("/api/workspaces", workspaceRoutes);
app.use("/api/notifications", notificationRoutes);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "IntellMeet API is running",
  });
});

// ==========================================
// HTTP SERVER
// ==========================================

const server = http.createServer(app);

// ==========================================
// SOCKET.IO
// ==========================================

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

// ========================================
// SOCKET.IO JWT AUTHENTICATION
// ========================================

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");
      return next(new Error("Authentication unavailable"));
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded.id) {
      return next(new Error("Invalid authentication token"));
    }

    const user = await User.findById(decoded.id)
      .select("_id name email");

    if (!user) {
      return next(new Error("Invalid authentication token"));
    }

    socket.data.userId = user._id.toString();

    socket.data.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };

    next();
  } catch (error) {
    next(new Error("Invalid or expired authentication token"));
  }
});
// Make Socket.io available to controllers
app.set("io", io);
// ==========================================
// MEETING JOIN APPROVAL
// ==========================================

// Stores requests from connected users waiting for approval.
// Requests are removed when approved, rejected, or disconnected.
const pendingJoinRequests = new Map();


async function checkMeetingAccess(roomId, userId) {
  if (!roomId || !userId) {
    return { allowed: false, reason: "Invalid meeting request." };
  }

  const meeting = await Meeting.findOne({ roomId }).select(
    "host participants status endTime"
  );

  if (!meeting) {
    return { allowed: false, reason: "Meeting not found." };
  }

  if (
    ["cancelled", "completed"].includes(meeting.status) ||
    (meeting.endTime && new Date() >= meeting.endTime)
  ) {
    return { allowed: false, reason: "This meeting is no longer available." };
  }

  const id = userId.toString();
  const isHost = meeting.host.toString() === id;
  const isParticipant = meeting.participants.some(
    (participant) => participant.toString() === id
  );

  return {
    allowed: isHost || isParticipant,
    isHost,
    isParticipant,
    meeting,
  };
}


async function socketHasMeetingAccess(socket, roomId) {
  try {
    if (
      !roomId ||
      !socket.data.userId ||
      socket.data.roomId !== roomId ||
      !socket.rooms.has(roomId)
    ) {
      return false;
    }

    const access = await checkMeetingAccess(
      roomId,
      socket.data.userId
    );

    return access.allowed === true;
  } catch (error) {
    console.error(
      "Socket meeting access check failed:",
      error.message
    );

    return false;
  }
}


// ==========================================
// SOCKET CONNECTION
// ==========================================

async function getMeetingAccess(roomId, userId) {
  if (!roomId || !userId) {
    return { allowed: false, reason: "Invalid request" };
  }

  const meeting = await Meeting.findOne({ roomId })
    .select("host participants status endTime");

  if (!meeting) {
    return { allowed: false, reason: "Meeting not found" };
  }

  if (meeting.status === "cancelled" ||
      meeting.status === "completed" ||
      (meeting.endTime && new Date() >= meeting.endTime)) {
    return { allowed: false, reason: "Meeting is no longer available" };
  }

  const id = userId.toString();
  const isHost = meeting.host.toString() === id;
  const isParticipant = meeting.participants.some(
    (participant) => participant.toString() === id
  );

  return {
    allowed: isHost || isParticipant,
    isHost,
    meeting,
  };
}

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // ========================================
  // JOIN MEETING ROOM
  // ========================================

socket.on(
  "meeting-feature",
  async ({ roomId, type, payload } = {}) => {
    try {
      if (
        !(await socketHasMeetingAccess(socket, roomId)) ||
        typeof type !== "string" ||
        !type.trim()
      ) {
        return;
      }

      socket.to(roomId).emit("meeting-feature", {
        roomId,
        type,
        payload: payload || {},
        sender: socket.data.user?.name || "Participant",
      });
    } catch (error) {
      console.error("Meeting feature error:", error.message);
    }
  }
);



socket.on("join-room", async ({ roomId } = {}) => {
  try {
    const access = await checkMeetingAccess(
      roomId,
      socket.data.userId
    );

    if (!access.allowed) {
      if (!access.meeting) {
        socket.emit("room-access-denied", {
          message: access.reason,
        });
        return;
      }

      // Prevent duplicate requests from this socket.
      const existingRequests = pendingJoinRequests.get(roomId);

      if (existingRequests?.has(socket.id)) {
        socket.emit("waiting-for-approval", {
          message: "Your request is already waiting for approval.",
        });
        return;
      }

      if (!pendingJoinRequests.has(roomId)) {
        pendingJoinRequests.set(roomId, new Map());
      }

      pendingJoinRequests.get(roomId).set(socket.id, {
        userId: socket.data.userId,
        userName: socket.data.user.name || "Participant",
        requestedAt: new Date(),
      });

      socket.data.pendingRoomId = roomId;

      socket.emit("waiting-for-approval", {
        message: "Waiting for the host to approve your request.",
      });

      // Notify only the authenticated meeting host.
      const roomSockets = await io.in(roomId).fetchSockets();
      const hostId = access.meeting.host.toString();

      for (const hostSocket of roomSockets) {
        if (hostSocket.data.userId === hostId) {
          hostSocket.emit("join-request", {
            requesterSocketId: socket.id,
            userName: socket.data.user.name || "Participant",
          });
        }
      }

      return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.pendingRoomId = null;
    socket.data.isMeetingHost = access.isHost;
    socket.data.userName = socket.data.user.name || "Participant";

    const room = io.sockets.adapter.rooms.get(roomId);
    const users = room
      ? Array.from(room)
          .filter((id) => id !== socket.id)
          .map((id) => ({
            socketId: id,
            userName:
              io.sockets.sockets.get(id)?.data?.userName ||
              "Participant",
            online: true,
          }))
      : [];

    socket.emit("room-users", users);
    socket.emit("room-joined", { roomId });

    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      userName: socket.data.userName,
      online: true,
    });

    io.to(roomId).emit("participant-status", {
      socketId: socket.id,
      userName: socket.data.userName,
      status: "online",
    });
  } catch (error) {
    console.error("Join room error:", error.message);
    socket.emit("room-access-denied", {
      message: "Unable to verify meeting access.",
    });
  }
});




  // ========================================
  // LIVE TRANSCRIPTION
  // ========================================


  socket.on("transcript-update", async (data = {}) => {
    try {
      const { roomId, text } = data;

      if (!(await socketHasMeetingAccess(socket, roomId))) {
        socket.emit("meeting-access-denied", {
          message: "You are not authorized to broadcast transcripts.",
        });
        return;
      }

      if (typeof text !== "string" || !text.trim()) return;

      socket.to(roomId).emit("transcript-update", {
        speaker: socket.data.user?.name || "Participant",
        text: text.trim(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Transcript broadcast error:", error);
    }
  });

  // ========================================
// ACTION ITEM UPDATE
// ========================================


  // ========================================
  // WEBRTC OFFER
  // ========================================

  
  socket.on("offer", async ({ target, offer } = {}) => {
    try {
      const roomId = socket.data.roomId;

      if (
        !(await socketHasMeetingAccess(socket, roomId)) ||
        !target ||
        !offer ||
        !socket.rooms.has(roomId) ||
        !io.sockets.sockets.get(target)?.rooms.has(roomId)
      ) {
        return;
      }

      io.to(target).emit("offer", {
        sender: socket.id,
        offer,
      });
    } catch (error) {
      console.error("WebRTC offer error:", error);
    }
  });


  // ========================================
  // WEBRTC ANSWER
  // ========================================

  
  socket.on("answer", async ({ target, answer } = {}) => {
    try {
      const roomId = socket.data.roomId;

      if (
        !(await socketHasMeetingAccess(socket, roomId)) ||
        !target ||
        !answer ||
        !io.sockets.sockets.get(target)?.rooms.has(roomId)
      ) {
        return;
      }

      io.to(target).emit("answer", {
        sender: socket.id,
        answer,
      });
    } catch (error) {
      console.error("WebRTC answer error:", error);
    }
  });


  // ========================================
  // ICE CANDIDATE
  // ========================================

 
  socket.on("ice-candidate", async ({ target, candidate } = {}) => {
    try {
      const roomId = socket.data.roomId;

      if (
        !(await socketHasMeetingAccess(socket, roomId)) ||
        !target ||
        !candidate ||
        !io.sockets.sockets.get(target)?.rooms.has(roomId)
      ) {
        return;
      }

      io.to(target).emit("ice-candidate", {
        sender: socket.id,
        candidate,
      });
    } catch (error) {
      console.error("ICE candidate error:", error);
    }
  });


  // ========================================
  // SEND CHAT MESSAGE
  // ========================================

 
  socket.on(
    "send-message",
    async ({ roomId, message } = {}) => {
      try {
        const hasAccess = await socketHasMeetingAccess(
          socket,
          roomId
        );

        if (!hasAccess) {
          socket.emit("meeting-access-denied", {
            message: "You are not authorized to send messages in this meeting.",
          });
          return;
        }

        if (typeof message !== "string") {
          return;
        }

        const trimmedMessage = message.trim();

        if (!trimmedMessage || trimmedMessage.length > 5000) {
          return;
        }

        const senderName =
          socket.data.user?.name ||
          socket.data.userName ||
          "Participant";

        const savedMessage = await Message.create({
          meetingRoomId: roomId,
          senderName,
          message: trimmedMessage,
        });

        io.to(roomId).emit("receive-message", {
          id: savedMessage._id,
          sender: senderName,
          message: savedMessage.message,
          timestamp: savedMessage.createdAt,
        });
      } catch (error) {
        console.error("Save message error:", error);
      }
    }
  );


  // ========================================
  // GET CHAT HISTORY
  // ========================================

  
  socket.on(
    "get-messages",
    async (roomId) => {
      try {
        const hasAccess = await socketHasMeetingAccess(
          socket,
          roomId
        );

        if (!hasAccess) {
          socket.emit("meeting-access-denied", {
            message: "You are not authorized to view this meeting's chat.",
          });
          return;
        }

        const messages = await Message.find({
          meetingRoomId: roomId,
        })
          .sort({ createdAt: 1 })
          .limit(100);

        socket.emit(
          "message-history",
          messages.map((item) => ({
            id: item._id,
            sender: item.senderName,
            message: item.message,
            timestamp: item.createdAt,
          }))
        );
      } catch (error) {
        console.error("Get message history error:", error);
      }
    }
  );



  
socket.on("approve-join-request", async ({ roomId, requesterSocketId } = {}) => {
  try {
    const meeting = await Meeting.findOne({ roomId });

    if (
      !meeting ||
      meeting.host.toString() !== socket.data.userId ||
      !socket.rooms.has(roomId)
    ) {
      socket.emit("approval-error", {
        message: "Only the meeting host can approve requests.",
      });
      return;
    }

    const requests = pendingJoinRequests.get(roomId);
    const request = requests?.get(requesterSocketId);
    const requester = io.sockets.sockets.get(requesterSocketId);

    if (
      !request ||
      !requester ||
      requester.data.pendingRoomId !== roomId ||
      requester.data.userId !== request.userId
    ) {
      socket.emit("approval-error", {
        message: "This join request is no longer available.",
      });
      return;
    }

    if (
      ["cancelled", "completed"].includes(meeting.status) ||
      (meeting.endTime && new Date() >= meeting.endTime)
    ) {
      requester.emit("request-rejected", {
        message: "This meeting is no longer available.",
      });
      requests.delete(requesterSocketId);
      return;
    }

    // Approval grants participant access for future reconnects.
    const alreadyParticipant = meeting.participants.some(
      (id) => id.toString() === request.userId
    );

    if (!alreadyParticipant) {
      meeting.participants.push(request.userId);
      await meeting.save();
    }

    requests.delete(requesterSocketId);
    if (requests.size === 0) {
      pendingJoinRequests.delete(roomId);
    }

    requester.join(roomId);
    requester.data.roomId = roomId;
    requester.data.pendingRoomId = null;
    requester.data.isMeetingHost = false;
    requester.data.userName = requester.data.user.name || "Participant";

    const room = io.sockets.adapter.rooms.get(roomId);
    const users = room
      ? Array.from(room)
          .filter((id) => id !== requester.id)
          .map((id) => ({
            socketId: id,
            userName:
              io.sockets.sockets.get(id)?.data?.userName ||
              "Participant",
            online: true,
          }))
      : [];

    requester.emit("room-users", users);
    requester.emit("room-joined", { roomId });

    requester.to(roomId).emit("user-joined", {
      socketId: requester.id,
      userName: requester.data.userName,
      online: true,
    });

    io.to(roomId).emit("participant-status", {
      socketId: requester.id,
      userName: requester.data.userName,
      status: "online",
    });

    requester.emit("join-request-approved", {
      message: "The host approved your request.",
    });
  } catch (error) {
    console.error("Approve join request error:", error.message);
    socket.emit("approval-error", {
      message: "Unable to approve this request.",
    });
  }
});


socket.on(
  "reject-join-request",
  async ({ roomId, requesterSocketId } = {}) => {
    try {
      const meeting = await Meeting.findOne({ roomId });

      // Verify the host against the database.
      if (
        !meeting ||
        meeting.host.toString() !== socket.data.userId ||
        !socket.rooms.has(roomId)
      ) {
        socket.emit("approval-error", {
          message: "Only the meeting host can reject requests.",
        });
        return;
      }

      const requests = pendingJoinRequests.get(roomId);
      const request = requests?.get(requesterSocketId);
      const requester = io.sockets.sockets.get(requesterSocketId);

      if (!request || !requester) {
        socket.emit("approval-error", {
          message: "This join request is no longer available.",
        });
        return;
      }

      requests.delete(requesterSocketId);

      if (requests.size === 0) {
        pendingJoinRequests.delete(roomId);
      }

      if (requester.data.pendingRoomId === roomId) {
        requester.data.pendingRoomId = null;

        requester.emit("request-rejected", {
          message: "The host declined your join request.",
        });
      }
    } catch (error) {
      console.error("Reject join request error:", error.message);

      socket.emit("approval-error", {
        message: "Unable to reject this request.",
      });
    }
  }
);


  // ========================================
  // USER DISCONNECTED
  // ========================================

  socket.on(
    "disconnect",
    () => {
      for (const [pendingRoomId, requests] of pendingJoinRequests) {
        if (requests.delete(socket.id) && requests.size === 0) {
          pendingJoinRequests.delete(pendingRoomId);
        }
      }
      const roomId =
        socket.data.roomId;

      const userName =
        socket.data.userName ||
        "Guest";

      console.log(
        `${userName} disconnected:`,
        socket.id
      );

      if (roomId) {
        // Tell remaining participants
        // that this user went offline
        socket.to(roomId).emit(
          "participant-status",
          {
            socketId: socket.id,
            userName,
            status: "offline",
          }
        );

        // Existing WebRTC cleanup event
        socket.to(roomId).emit(
          "user-left",
          {
            socketId: socket.id,
            userName,
          }
        );
      }
    }
  );
});

// ==========================================
// START SERVER
// ==========================================

const PORT =
  process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `IntellMeet server running on port ${PORT}`
  );
});