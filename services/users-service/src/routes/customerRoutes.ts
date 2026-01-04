import { Router } from "express";
import {
  importCustomers,
  getCustomers,
} from "../controllers/customerController";

const router = Router();

router.post("/import", importCustomers);
router.get("/", getCustomers);

export default router;
