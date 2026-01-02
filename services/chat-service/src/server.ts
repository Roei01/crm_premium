import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/db';
import { initSocket } from './socket';
import Message from './models/Message';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const app = express();
const server = http.createServer(app);

// Init Socket.io
initSocket(server);

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

const PORT = process.env.PORT_CHAT || 3004;

// REST API for Chat History
app.get('/messages/:userId', async (req, res) => {
  // Simple auth check from header (passed by gateway)
  const currentUserId = req.headers['x-user-id'] as string;
  const tenantId = req.headers['x-tenant-id'] as string;
  const otherUserId = req.params.userId;

  if (!currentUserId || !tenantId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const messages = await Message.find({
      tenantId: tenantId,
      $or: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId }
      ]
    }).sort({ createdAt: 1 }).limit(100);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching history' });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'chat-service' });
});

const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Chat Service running on port ${PORT}`);
  });
};

start();

