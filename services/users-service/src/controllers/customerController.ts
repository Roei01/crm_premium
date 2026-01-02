import { Request, Response } from 'express';
import Customer from '../models/Customer';
import { z } from 'zod';

const CreateCustomerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  status: z.enum(['LEAD', 'PROSPECT', 'CUSTOMER', 'CHURNED']).optional()
});

const ImportCustomersSchema = z.array(CreateCustomerSchema);

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!tenantId || !userId) return res.status(401).json({ message: 'Unauthorized' });

    const validated = CreateCustomerSchema.parse(req.body);

    const customer = await Customer.create({
      ...validated,
      tenantId,
      createdBy: userId,
      assignedTo: userId // Default assign to creator
    });

    res.status(201).json(customer);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Error creating customer' });
  }
};

export const listCustomers = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

    const customers = await Customer.find({ tenantId }).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching customers' });
  }
};

export const importCustomers = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!tenantId || !userId) return res.status(401).json({ message: 'Unauthorized' });

    const customersData = ImportCustomersSchema.parse(req.body);

    // Prepare data with tenant info
    const toInsert = customersData.map(c => ({
      ...c,
      tenantId,
      createdBy: userId,
      assignedTo: userId
    }));

    // Bulk write to handle potential duplicates (skip or update? For now, insert and fail on dupes or unordered?)
    // ordered: false allows continuing even if some fail (dupes)
    // But duplicate email in same tenant will throw.
    
    // Simplest: use insertMany with ordered: false to skip duplicates
    try {
      const result = await Customer.insertMany(toInsert, { ordered: false });
      res.status(201).json({ message: `Successfully imported ${result.length} customers` });
    } catch (bulkError: any) {
      // If some inserted, result might be in bulkError.insertedDocs?
      // Mongoose throws on insertMany error
      const insertedCount = bulkError.insertedDocs?.length || 0;
      res.status(201).json({ 
        message: `Imported ${insertedCount} customers. Some failed (likely duplicates).`,
        errors: bulkError.writeErrors?.map((e: any) => e.errmsg)
      });
    }

  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Error importing customers' });
  }
};

