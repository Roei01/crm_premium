import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import emailRoutes from './routes/emailRoutes';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT_EMAIL || 3006;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'email-service' });
});

app.use('/emails', emailRoutes);

const MONGODB_URI = process.env.MONGODB_URI!;

mongoose
  .connect(MONGODB_URI, { dbName: 'email_db' })
  .then(() => {
    console.log('✅ Email service connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`📧 Email service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
