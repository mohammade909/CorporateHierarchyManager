import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const JWT_SECRET = 'your-secret-key';

// Types
export type AuthUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  companyId: number | null;
};

export type JwtPayload = {
  userId: number;
  username: string;
  email: string;
  role: string;
  companyId: number | null;
};

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// JWT token generation and verification
export function generateToken(user: AuthUser): string {
  const payload: JwtPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

// Express middleware for authentication
export function authenticateJwt(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Token error' });
  }
  
  const token = parts[1];
  
  try {
    const payload = verifyToken(token);
    (req as any).user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Role-based authorization middleware
export function authorize(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (!allowedRoles.includes((req as any).user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    next();
  };
}

// Schemas for validation
export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: z.enum(['super_admin', 'company_admin', 'manager', 'employee']),
  companyId: z.number().optional().nullable(),
  managerId: z.number().optional().nullable(),
});
