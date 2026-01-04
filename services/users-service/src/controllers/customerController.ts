import { Request, Response } from "express";
import Customer from "../models/Customer";
import { z } from "zod";

const CustomerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  notes: z.string().optional(),
});

const ImportCustomersSchema = z.array(CustomerSchema);

export const importCustomers = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const userId = req.headers["x-user-id"] as string;

    if (!tenantId || !userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Parse and validate
    const customersData = ImportCustomersSchema.parse(req.body);

    const toInsert = customersData.map((c) => ({
      ...c,
      tenantId,
      createdBy: userId,
      assignedTo: userId,
      status: c.status || "LEAD",
    }));

    try {
      const result = await Customer.insertMany(toInsert, { ordered: false });
      res.status(201).json({
        message: `Successfully imported ${result.length} customers`,
      });
    } catch (bulkError: any) {
      const insertedCount = bulkError.insertedDocs?.length || 0;
      res.status(201).json({
        message: `Imported ${insertedCount} customers. Some failed (likely duplicates).`,
        errors: bulkError.writeErrors?.map((e: any) => e.errmsg),
      });
    }
  } catch (error: any) {
    res
      .status(400)
      .json({ message: error.message || "Error importing customers" });
  }
};

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;

    if (!tenantId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const customers = await Customer.find({ tenantId }).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: error.message || "Error fetching customers" });
  }
};
