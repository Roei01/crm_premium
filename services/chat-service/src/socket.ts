import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "./models/Message";

interface SocketUser {
  id: string;
  role: string;
  tenantId: string;
  firstName?: string;
}

export const initSocket = (httpServer: http.Server) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Allow all for now, tighten later
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  // Authentication Middleware
  io.use((socket, next) => {
    const token =
      socket.handshake.auth.token || socket.handshake.headers.authorization;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    // Clean "Bearer " if present
    const cleanToken = token.replace("Bearer ", "");

    jwt.verify(
      cleanToken,
      process.env.JWT_SECRET!,
      (err: any, decoded: any) => {
        if (err) return next(new Error("Authentication error: Invalid token"));

        // Attach user info to socket
        (socket as any).user = {
          id: decoded.id,
          role: decoded.role,
          tenantId: decoded.tenantId,
          firstName: "User", // ideally fetch from user-service, but for speed just use 'User' or store in token
        };
        next();
      }
    );
  });

  io.on("connection", (socket) => {
    const user = (socket as any).user as SocketUser;
    console.log(`User connected: ${user.id} (${user.tenantId})`);

    // Join room for their own ID (for direct messages)
    socket.join(user.id);
    // Join room for their tenant (for broadcast)
    socket.join(user.tenantId);

    // Handle Private Message
    socket.on("send_private_message", async (data) => {
      const { to, content } = data; // Changed from toUserId to to match frontend

      // Save to DB
      const message = await Message.create({
        senderId: user.id,
        senderName: user.firstName || "User", // TODO: Get real name
        receiverId: to,
        content: content,
        tenantId: user.tenantId,
      });

      // Emit to receiver
      io.to(to).emit("receive_private_message", message);

      // Emit back to sender (for their UI to update if they listen)
      socket.emit("receive_private_message", message);
    });

    // Handle Room/Group Message (Optional for now)

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${user.id}`);
    });
  });

  return io;
};
