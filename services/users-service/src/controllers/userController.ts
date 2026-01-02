import { Request, Response } from 'express';
import User from '../models/User';
import { z } from 'zod';

// Schema for creating a user (Admin/TeamLead only)
const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(['ADMIN', 'TEAM_LEAD', 'EMPLOYEE']).optional(),
  // tenantId is inferred from the creator's tenantId for security
});

export const getMe = async (req: Request, res: Response) => {
  try {
    // Headers passed from Gateway
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ message: 'User context missing' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    // Creator context from Gateway
    const creatorTenantId = req.headers['x-tenant-id'] as string;
    const creatorRole = req.headers['x-user-role'] as string;

    if (!creatorTenantId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // RBAC Check: Only Admin or Team Lead can create users
    if (creatorRole !== 'ADMIN' && creatorRole !== 'TEAM_LEAD') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const validated = CreateUserSchema.parse(req.body);

    // Force the new user into the same tenant as the creator
    const userData = {
      ...validated,
      tenantId: creatorTenantId
    };

    const existingUser = await User.findOne({ email: validated.email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const newUser = await User.create(userData);

    res.status(201).json({
      _id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      tenantId: newUser.tenantId
    });

  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Error creating user' });
  }
};

export const listUsers = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const users = await User.find({ tenantId }).select('-password');
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

