"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Message_1 = __importDefault(require("../models/Message"));
const initSocket = (httpServer) => {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: "*", // Allow all for now, tighten later
            methods: ["GET", "POST"]
        },
        path: '/socket.io'
    });
    // Authentication Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }
        // Clean "Bearer " if present
        const cleanToken = token.replace('Bearer ', '');
        jsonwebtoken_1.default.verify(cleanToken, process.env.JWT_SECRET, (err, decoded) => {
            if (err)
                return next(new Error("Authentication error: Invalid token"));
            // Attach user info to socket
            socket.user = {
                id: decoded.id,
                role: decoded.role,
                tenantId: decoded.tenantId,
                firstName: 'User' // ideally fetch from user-service, but for speed just use 'User' or store in token
            };
            next();
        });
    });
    io.on('connection', (socket) => {
        const user = socket.user;
        console.log(`User connected: ${user.id} (${user.tenantId})`);
        // Join room for their own ID (for direct messages)
        socket.join(user.id);
        // Join room for their tenant (for broadcast)
        socket.join(user.tenantId);
        // Handle Private Message
        socket.on('send_private_message', async (data) => {
            const { toUserId, content } = data;
            // Save to DB
            const message = await Message_1.default.create({
                senderId: user.id,
                senderName: user.firstName || 'User', // TODO: Get real name
                receiverId: toUserId,
                content: content,
                tenantId: user.tenantId
            });
            // Emit to receiver
            io.to(toUserId).emit('new_message', {
                _id: message._id,
                from: user.id,
                content: content,
                createdAt: message.createdAt
            });
            // Emit back to sender (confirmation/update UI)
            socket.emit('message_sent', message);
        });
        // Handle Room/Group Message (Optional for now)
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${user.id}`);
        });
    });
    return io;
};
exports.initSocket = initSocket;
