import { Request, Response } from "express";
import User, { UserRole } from "../models/User";
import jwt from "jsonwebtoken";
import { z } from "zod";

const generateToken = (
  id: string,
  role: string,
  tenantId: string,
  firstName: string,
  lastName: string
) => {
  const expiresIn = process.env.ACCESS_TOKEN_TTL_MINUTES
    ? `${process.env.ACCESS_TOKEN_TTL_MINUTES}m`
    : "15m";

  return jwt.sign(
    { id, role, tenantId, firstName, lastName },
    process.env.JWT_SECRET!,
    {
      expiresIn: expiresIn as any, // Force casting to avoid TS mismatch with jwt types
    }
  );
};

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string(),
  lastName: z.string(),
  role: z.nativeEnum(UserRole).optional(),
  tenantId: z.string().min(1),
});

export const register = async (req: Request, res: Response) => {
  try {
    const validated = RegisterSchema.parse(req.body);

    const userExists = await User.findOne({ email: validated.email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // TODO: Phase 2 - Check permissions. Only Admin/TeamLead should create users.
    // For now, allowing open registration to seed the first user.

    const user = await User.create(validated);

    if (user) {
      res.status(201).json({
        _id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        token: generateToken(
          user.id,
          user.role,
          user.tenantId,
          user.firstName,
          user.lastName
        ),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error: any) {
    res
      .status(400)
      .json({ message: error.message || "Error registering user" });
  }
};

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const user = await User.findOne({ email }).select("+password");

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        token: generateToken(
          user.id,
          user.role,
          user.tenantId,
          user.firstName,
          user.lastName
        ),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Error logging in" });
  }
};
