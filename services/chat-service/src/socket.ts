import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "./models/Message";

interface SocketUser {
  id: string;
  role: string;
  tenantId: string;
  firstName?: string;
  lastName?: string;
}

// Track online users per tenant: tenantId -> Set<userId>
const onlineUsers = new Map<string, Set<string>>();

export const initSocket = (httpServer: http.Server) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth.token || socket.handshake.headers.authorization;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const cleanToken = token.replace("Bearer ", "");

    jwt.verify(
      cleanToken,
      process.env.JWT_SECRET!,
      (err: any, decoded: any) => {
        if (err) return next(new Error("Authentication error: Invalid token"));

        (socket as any).user = {
          id: decoded.id,
          role: decoded.role,
          tenantId: decoded.tenantId,
          firstName: decoded.firstName,
          lastName: decoded.lastName,
        };
        next();
      }
    );
  });

  io.on("connection", (socket) => {
    const user = (socket as any).user as SocketUser;
    console.log(`User connected: ${user.id} (${user.tenantId})`);

    socket.join(user.id);
    socket.join(user.tenantId);

    // Track online presence
    if (!onlineUsers.has(user.tenantId)) {
      onlineUsers.set(user.tenantId, new Set());
    }
    onlineUsers.get(user.tenantId)!.add(user.id);
    io.to(user.tenantId).emit(
      "online_users",
      Array.from(onlineUsers.get(user.tenantId)!)
    );

    // Private message
    socket.on("send_private_message", async (data) => {
      const { to, content } = data;

      const senderName =
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.firstName || "User";

      const message = await Message.create({
        senderId: user.id,
        senderName,
        receiverId: to,
        content,
        tenantId: user.tenantId,
      });

      io.to(to).emit("receive_private_message", message);
      socket.emit("receive_private_message", message);
    });

    // Typing indicators
    socket.on("typing", (data: { to: string }) => {
      io.to(data.to).emit("user_typing", { userId: user.id });
    });

    socket.on("stop_typing", (data: { to: string }) => {
      io.to(data.to).emit("user_stop_typing", { userId: user.id });
    });

    // Mark messages as read
    socket.on("mark_read", async (data: { from: string }) => {
      const now = new Date();
      await Message.updateMany(
        {
          senderId: data.from,
          receiverId: user.id,
          tenantId: user.tenantId,
          readAt: { $exists: false },
        },
        { $set: { readAt: now } }
      );
      // Notify the original sender their messages were read
      io.to(data.from).emit("messages_read", {
        by: user.id,
        at: now.toISOString(),
      });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${user.id}`);
      const tenantOnline = onlineUsers.get(user.tenantId);
      if (tenantOnline) {
        tenantOnline.delete(user.id);
        io.to(user.tenantId).emit("online_users", Array.from(tenantOnline));
      }
    });
  });

  return io;
};
