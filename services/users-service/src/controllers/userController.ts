import { Request, Response } from 'express';
import User from '../models/User';
import ActionLog from '../models/ActionLog';
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

    await ActionLog.create({
      tenantId: creatorTenantId,
      performedBy: req.headers['x-user-id'],
      action: 'CREATE_USER',
      targetId: newUser.id,
      targetType: 'USER',
      details: { email: newUser.email, role: newUser.role }
    });

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

    const users = await User.find({ tenantId, deletedAt: null }).select('-password');
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const targetId = req.params.id;

    if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

    if (userRole !== 'ADMIN' && userRole !== 'TEAM_LEAD') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const user = await User.findOne({ _id: targetId, tenantId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.deletedAt = new Date();
    user.deletedBy = userId;
    await user.save();

    await ActionLog.create({
      tenantId,
      performedBy: userId,
      action: 'DELETE_USER',
      targetId: user.id,
      targetType: 'USER',
      details: { email: user.email }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const listDeletedUsers = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });
    if (userRole !== 'ADMIN' && userRole !== 'TEAM_LEAD') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const users = await User.find({ tenantId, deletedAt: { $ne: null } }).select('-password');
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const restoreUser = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const targetId = req.params.id;

    if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });
    if (userRole !== 'ADMIN' && userRole !== 'TEAM_LEAD') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const user = await User.findOne({ _id: targetId, tenantId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.deletedAt = null;
    user.deletedBy = null;
    await user.save();

    await ActionLog.create({
      tenantId,
      performedBy: req.headers['x-user-id'],
      action: 'RESTORE_USER',
      targetId: user.id,
      targetType: 'USER',
      details: { email: user.email }
    });

    res.json({ message: 'User restored successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });
    if (userRole !== 'ADMIN') return res.status(403).json({ message: 'Insufficient permissions' });

    const logs = await ActionLog.find({ tenantId }).sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

