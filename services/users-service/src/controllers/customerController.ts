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

const UpdateCustomerSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  status: z.enum(['LEAD', 'PROSPECT', 'CUSTOMER', 'CHURNED']).optional(),
  assignedTo: z.string().optional()
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
      assignedTo: userId
    });

    res.status(201).json(customer);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Error creating customer' });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    const validated = UpdateCustomerSchema.parse(req.body);

    const customer = await Customer.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: validated },
      { new: true, runValidators: true }
    );

    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    res.json(customer);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Error updating customer' });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    const customer = await Customer.findOneAndDelete({ _id: id, tenantId });

    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    res.json({ message: 'Customer deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting customer' });
  }
};

export const listCustomers = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

    const { status, search, assignedTo } = req.query;

    const filter: any = { tenantId };

    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (search) {
      const regex = new RegExp(search as string, 'i');
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { company: regex }
      ];
    }

    const customers = await Customer.find(filter).sort({ createdAt: -1 });
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

    const toInsert = customersData.map(c => ({
      ...c,
      tenantId,
      createdBy: userId,
      assignedTo: userId
    }));

    try {
      const result = await Customer.insertMany(toInsert, { ordered: false });
      res.status(201).json({ message: `Successfully imported ${result.length} customers` });
    } catch (bulkError: any) {
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
