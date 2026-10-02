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
const transcriptRoutes = require("./routes/transcriptRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const path = require("path");

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
// Make Socket.io available to controllers
app.set("io", io);

// ==========================================
// SOCKET CONNECTION
// ==========================================

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // ========================================
  // JOIN MEETING ROOM
  // ========================================
socket.on("meeting-feature", ({ roomId, type, payload, sender }) => {
  if (!roomId || !type) return;

  socket.to(roomId).emit("meeting-feature", {
    roomId,
    type,
    payload: payload || {},
    sender: sender || "Participant",
  });
});
  socket.on(
    "join-room",
    ({ roomId, userName }) => {
      socket.join(roomId);

      socket.data.roomId = roomId;
      socket.data.userName =
        userName || "Guest";

      const room =
        io.sockets.adapter.rooms.get(roomId);

      const users = room
        ? Array.from(room)
            .filter(
              (id) => id !== socket.id
            )
            .map((id) => ({
              socketId: id,
              userName:
                io.sockets.sockets.get(id)
                  ?.data?.userName ||
                "Guest",
              online: true,
            }))
        : [];

      // Send existing participants
      socket.emit(
        "room-users",
        users
      );

      // Tell existing participants
      // that a new participant joined
      socket.to(roomId).emit(
        "user-joined",
        {
          socketId: socket.id,
          userName:
            socket.data.userName,
          online: true,
        }
      );

      // Send presence update
      io.to(roomId).emit(
        "participant-status",
        {
          socketId: socket.id,
          userName:
            socket.data.userName,
          status: "online",
        }
      );

      console.log(
        `${socket.data.userName} (${socket.id}) joined room ${roomId}`
      );
    }
  );


  // ========================================
  // LIVE TRANSCRIPTION
  // ========================================

  socket.on(
    "transcript-update",
    ({
      roomId,
      speaker,
      text,
      timestamp,
    }) => {
      try {
        // Validate data
        if (
          !roomId ||
          !speaker ||
          !text ||
          !text.trim()
        ) {
          return;
        }

        // Make sure the socket belongs
        // to this meeting room
        if (
          socket.data.roomId !== roomId
        ) {
          console.warn(
            "Unauthorized transcript room:",
            socket.id
          );

          return;
        }

        const transcriptData = {
          speaker,
          text: text.trim(),
          timestamp:
            timestamp ||
            new Date().toISOString(),
        };

        // Send transcript to all OTHER
        // participants in the room
        socket
          .to(roomId)
          .emit(
            "transcript-update",
            transcriptData
          );

        console.log(
          `Transcript broadcast | ${speaker}: ${text.trim()}`
        );
      } catch (error) {
        console.error(
          "Transcript broadcast error:",
          error
        );
      }
    }
  );
  // ========================================
// ACTION ITEM UPDATE
// ========================================


  // ========================================
  // WEBRTC OFFER
  // ========================================

  socket.on(
    "offer",
    ({ target, offer }) => {
      io.to(target).emit(
        "offer",
        {
          sender: socket.id,
          offer,
        }
      );
    }
  );

  // ========================================
  // WEBRTC ANSWER
  // ========================================

  socket.on(
    "answer",
    ({ target, answer }) => {
      io.to(target).emit(
        "answer",
        {
          sender: socket.id,
          answer,
        }
      );
    }
  );

  // ========================================
  // ICE CANDIDATE
  // ========================================

  socket.on(
    "ice-candidate",
    ({ target, candidate }) => {
      io.to(target).emit(
        "ice-candidate",
        {
          sender: socket.id,
          candidate,
        }
      );
    }
  );

  // ========================================
  // SEND CHAT MESSAGE
  // ========================================

  socket.on(
    "send-message",
    async ({
      roomId,
      message,
      sender,
    }) => {
      try {
        if (
          !roomId ||
          !message ||
          !sender
        ) {
          return;
        }

        const trimmedMessage =
          message.trim();

        if (!trimmedMessage) {
          return;
        }

        const savedMessage =
          await Message.create({
            meetingRoomId: roomId,
            senderName: sender,
            message: trimmedMessage,
          });

        io.to(roomId).emit(
          "receive-message",
          {
            id: savedMessage._id,
            sender:
              savedMessage.senderName,
            message:
              savedMessage.message,
            timestamp:
              savedMessage.createdAt,
          }
        );
      } catch (error) {
        console.error(
          "Save message error:",
          error
        );
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
        if (!roomId) {
          return;
        }

        const messages =
          await Message.find({
            meetingRoomId: roomId,
          })
            .sort({ createdAt: 1 })
            .limit(100);

        socket.emit(
          "message-history",
          messages.map((item) => ({
            id: item._id,
            sender:
              item.senderName,
            message:
              item.message,
            timestamp:
              item.createdAt,
          }))
        );
      } catch (error) {
        console.error(
          "Get message history error:",
          error
        );
      }
    }
  );

  // ========================================
  // USER DISCONNECTED
  // ========================================

  socket.on(
    "disconnect",
    () => {
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