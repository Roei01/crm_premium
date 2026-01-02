import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import userRoutes from "./routes/userRoutes";

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.use("/", userRoutes);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "users-service" });
});

export default app;
