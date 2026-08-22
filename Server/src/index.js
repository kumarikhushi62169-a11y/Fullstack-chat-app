const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const jwt = require("jsonwebtoken");

require("dotenv").config();
require("./config/db");
const db = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const groupRoutes = require("./routes/groupRoutes");
const { apiLimiter } = require("./middleware/rateLimit");

const app = express();
const server = http.createServer(app);

// ===============================
// Socket Users
// ===============================
const onlineUsers = {};
const JWT_SECRET = process.env.JWT_SECRET || "chat-app-development-secret";

const io = new Server(server, {
  cors: {
    origin: (process.env.CLIENT_ORIGIN || "http://localhost:5173,http://localhost:5174").split(","),
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());
app.use("/api", apiLimiter);

app.use("/uploads", express.static("src/uploads"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Chat Server Running");
});

app.get("/api/health", (req, res) => {
  db.query("SELECT 1 AS database_ok", (err, rows) => {
    if (err) {
      return res.status(503).json({
        success: false,
        server: "ok",
        database: "unavailable",
        error: err.message,
      });
    }

    res.json({
      success: true,
      server: "ok",
      database: rows[0].database_ok === 1 ? "connected" : "unavailable",
      databaseName: process.env.DB_NAME || "chat_app",
    });
  });
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    socket.userId = user.id;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  console.log("✅ User Connected:", socket.id);

  // ==========================
  // User Online
  // ==========================
 socket.on("userOnline", () => {
  const userId = socket.userId;
  console.log("🟢 User Online:", userId);

  socket.userId = userId;

  // userId → socket.id
  onlineUsers[userId] = socket.id;

  console.log("👥 Online Users:", onlineUsers);

  db.query(
    "UPDATE users SET status='online' WHERE id=?",
    [userId],
    (err) => {
      if (err) {
        console.log("❌ Online Status Error:", err);
        return;
      }

      console.log("✅ User Status Updated Online:", userId);
    }
  );
}); 

  // ==========================
  // Send Message
  // ==========================
// Send Message
// ==========================
socket.on("sendMessage", (data) => {
  console.log("📩 Message Received:", data);

  const messageData = {
    ...data,
    sender_id: socket.userId,
  };

  io.to(socket.id).emit("messageSent", messageData);

  const receiverSocket = onlineUsers[messageData.receiver_id];

  if (receiverSocket) {
    console.log(
      `📤 Sending message to user ${data.receiver_id}`
    );

    io.to(receiverSocket).emit("receiveMessage", messageData);
  } else {
    console.log(
      `⚠ User ${messageData.receiver_id} is offline`
    );
  }
});


socket.on("messagesSeen", (data) => {
  console.log("👀 Messages Seen:", data);

  // Message sender
  const senderSocket = onlineUsers[data.sender_id];

  if (senderSocket) {
    io.to(senderSocket).emit("messagesSeen", data);
  }

  // Message receiver
  const receiverSocket = onlineUsers[data.receiver_id];

  if (receiverSocket) {
    io.to(receiverSocket).emit("messagesSeen", data);
  }
});
  // ==========================
  // Message Delivered
  // ==========================
  socket.on("messageDelivered", (data) => {

    const senderSocket = onlineUsers[data.sender_id];
 
    if (senderSocket) {
      io.to(senderSocket).emit("messageDelivered", data);
    }

  });

  // ==========================
  // Typing
  // ==========================
  socket.on("typing", (data) => {

    const receiverSocket = onlineUsers[data.receiver_id];

    if (receiverSocket) {
      io.to(receiverSocket).emit("typing", data);
    }

  });

  // ==========================
  // Stop Typing
  // ==========================
  socket.on("stopTyping", (data) => {

    const receiverSocket = onlineUsers[data.receiver_id];

    if (receiverSocket) {
      io.to(receiverSocket).emit("stopTyping", data);
    }

  });

  // ==========================
  // Group Chat Rooms
  // ==========================
  socket.on("joinGroup", (groupId) => {
    const room = `group:${Number(groupId)}`;

    db.query(
      "SELECT 1 FROM group_members WHERE group_id=? AND user_id=?",
      [Number(groupId), socket.userId],
      (err, rows) => {
        if (!err && rows.length > 0) {
          socket.join(room);
          socket.emit("groupJoined", { group_id: Number(groupId) });
        }
      },
    );
  });

  socket.on("leaveGroup", (groupId) => {
    socket.leave(`group:${Number(groupId)}`);
  });

  socket.on("groupMessage", (data) => {
    const groupId = Number(data.group_id);
    const room = `group:${groupId}`;

    if (!socket.rooms.has(room)) return;

    io.to(room).emit("groupMessage", {
      ...data,
      group_id: groupId,
      sender_id: socket.userId,
    });
  });

  // ==========================
  // WebRTC Call Signaling
  // ==========================
  const forwardCallEvent = (event, data) => {
    const targetSocket = onlineUsers[Number(data.to)];
    if (targetSocket) {
      io.to(targetSocket).emit(event, {
        ...data,
        from: socket.userId,
      });
    }
  };

  socket.on("callOffer", (data) => {
    db.query(
      "INSERT INTO call_logs (caller_id, receiver_id, call_type) VALUES (?, ?, ?)",
      [socket.userId, Number(data.to), data.type === "video" ? "video" : "audio"],
      (err, result) => {
        if (err) {
          console.log("Call log error:", err.message);
          return;
        }

        const callData = { ...data, call_id: result.insertId };
        socket.emit("callStarted", { call_id: result.insertId });
        forwardCallEvent("callOffer", callData);
      },
    );
  });

  socket.on("callAnswer", (data) => {
    if (data.call_id) {
      db.query("UPDATE call_logs SET status='accepted' WHERE id=?", [data.call_id]);
    }
    forwardCallEvent("callAnswer", data);
  });
  socket.on("callIceCandidate", (data) => forwardCallEvent("callIceCandidate", data));
  socket.on("callEnd", (data) => {
    if (data.call_id) {
      db.query("UPDATE call_logs SET status='ended', ended_at=NOW() WHERE id=?", [data.call_id]);
    }
    forwardCallEvent("callEnd", data);
  });

  // ==========================
  // Disconnect
  // ==========================
  socket.on("disconnect", () => {

    console.log("❌ User Disconnected:", socket.id);

    if (!socket.userId) {
      console.log("⚠ No userId found on socket");
      return;
    }

    delete onlineUsers[socket.userId];

    db.query(
      "UPDATE users SET status='offline', last_seen=NOW() WHERE id=?",
      [socket.userId],
      (err) => {
        if (err) {
          console.log(err);
          return;
        }

        console.log("🕒 Last Seen Updated:", socket.userId);
      }
    );
  });
});

const PORT = process.env.PORT || 5001;

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `⚠ Port ${PORT} is already in use. The existing Chat server is still running.`,
    );
    return;
  }

  console.error("❌ Server error:", error);
});

server.listen(PORT, () => {
  console.log(`🚀 Server Running On Port ${PORT}`);
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  res.status(error.statusCode || 400).json({
    success: false,
    message: error.message || "Request failed",
  });
});