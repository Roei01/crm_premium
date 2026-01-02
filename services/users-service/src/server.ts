import dotenv from "dotenv";
import path from "path";

// Load env from root if not present
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

import app from "./app";
import { connectDB } from "./config/db";

const PORT = process.env.PORT_USERS || 3002;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Users Service running on port ${PORT}`);
  });
};

start();
