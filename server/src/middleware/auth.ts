import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV, logger } from '../config';

export interface AuthPayload {
  userId: string;
  email: string;
  plan: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    logger.warn({ err }, 'Invalid JWT token');
    res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      req.user = jwt.verify(token, ENV.JWT_SECRET) as AuthPayload;
    } catch { /* ignore invalid tokens for optional auth */ }
  }
  next();
}

export function requirePlan(...plans: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
      return;
    }
    if (!plans.includes(req.user.plan)) {
      res.status(403).json({ error: `This feature requires ${plans.join(' or ')} plan`, code: 'PLAN_UPGRADE_REQUIRED' });
      return;
    }
    next();
  };
}
