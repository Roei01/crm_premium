import dotenv from "dotenv";
import path from "path";

// Load env from root if not present
// Adjust path based on execution context (usually root of repo or service root)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config(); // Load local .env if exists

import app from "./app";
import { connectDB } from "./config/db";

const PORT = process.env.PORT_AUTH || 3001;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
  });
};

start();
