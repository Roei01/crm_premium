"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./config/db");
const socket_1 = require("./socket");
const Message_1 = __importDefault(require("./models/Message"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Init Socket.io
(0, socket_1.initSocket)(server);
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
const PORT = process.env.PORT_CHAT || 3004;
// REST API for Chat History
app.get('/messages/:userId', async (req, res) => {
    // Simple auth check from header (passed by gateway)
    const currentUserId = req.headers['x-user-id'];
    const tenantId = req.headers['x-tenant-id'];
    const otherUserId = req.params.userId;
    if (!currentUserId || !tenantId)
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const messages = await Message_1.default.find({
            tenantId: tenantId,
            $or: [
                { senderId: currentUserId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: currentUserId }
            ]
        }).sort({ createdAt: 1 }).limit(100);
        res.json(messages);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching history' });
    }
});
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'chat-service' });
});
const start = async () => {
    await (0, db_1.connectDB)();
    server.listen(PORT, () => {
        console.log(`Chat Service running on port ${PORT}`);
    });
};
start();
