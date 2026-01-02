import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined in environment variables');
    // In test environment, we might not want to exit hard if mocking, but for now:
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    return;
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

