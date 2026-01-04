import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import proxy from "express-http-proxy";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const app = express();
const PORT = process.env.PORT_GATEWAY || 3000;

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "api-gateway" });
});

// Service URLs (from env or default to docker service names)
const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://localhost:3001";
const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL || "http://localhost:3002";
const TASKS_SERVICE_URL =
  process.env.TASKS_SERVICE_URL || "http://localhost:3003";
const CHAT_SERVICE_URL =
  process.env.CHAT_SERVICE_URL || "http://localhost:3004";
const NOTIFICATIONS_SERVICE_URL =
  process.env.NOTIFICATIONS_SERVICE_URL || "http://localhost:3005";

import { verifyToken } from "./middleware/authMiddleware";

// Routes
app.use("/auth", proxy(AUTH_SERVICE_URL));

// Proxy Websockets
app.use(
  "/socket.io",
  proxy(CHAT_SERVICE_URL, {
    // @ts-ignore: proxyReqWs exists in express-http-proxy but missing in types
    proxyReqWs: true,
  })
);

// Protected Routes Helper
const protectedProxy = (target: string) =>
  proxy(target, {
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (srcReq.headers["x-tenant-id"]) {
        proxyReqOpts.headers!["x-tenant-id"] = srcReq.headers["x-tenant-id"];
        proxyReqOpts.headers!["x-user-id"] = srcReq.headers["x-user-id"];
        proxyReqOpts.headers!["x-user-role"] = srcReq.headers["x-user-role"];
      }
      return proxyReqOpts;
    },
  });

app.use("/users", verifyToken, protectedProxy(USERS_SERVICE_URL));
app.use("/customers", verifyToken, protectedProxy(USERS_SERVICE_URL));
app.use("/tasks", verifyToken, protectedProxy(TASKS_SERVICE_URL));
app.use("/messages", verifyToken, protectedProxy(CHAT_SERVICE_URL));
app.use(
  "/notifications",
  verifyToken,
  protectedProxy(NOTIFICATIONS_SERVICE_URL)
);

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
