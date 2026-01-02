import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/authRoutes";

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.use("/", authRoutes);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "auth-service" });
});

export default app;
