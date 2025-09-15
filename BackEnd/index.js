import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import { Server } from "socket.io";
import dotenv from "dotenv";

import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";

// Load environment variables
dotenv.config();

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Parse allowed origins from environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS;

// Initialize Socket.io
export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Credentials",
    ],
  },
});

// Store online users
export const userSocketMap = {}; // {userId: socketId}

// Socket.io connection handler
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log("User connected with ID:", userId);

  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  // Emit online users
  io.emit("online-users", Object.keys(userSocketMap));

  // Emit offline users
  socket.on("disconnect", () => {
    console.log("User disconnected with ID:", userId);
    delete userSocketMap[userId];
    io.emit("online-users", Object.keys(userSocketMap));
  });
});

// Middleware
app.use(express.json({ limit: "4mb" }));
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use("/api/status", (req, res) => res.send("Server is running"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

// Connect to MongoDB
await connectDB();

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 8080;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default server;
