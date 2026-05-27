import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { db, ENV, logger } from '../config';
import { authenticate, AuthPayload } from '../middleware/auth';
import { validate, asyncHandler } from '../middleware/validate';
import { authenticator } from '../lib/otplib';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  fullName: z.string().min(1, 'Name is required').max(100),
  stateOfResidence: z.string().length(2, 'State code must be 2 letters'),
  timezone: z.string().default('America/New_York'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function generateTokens(user: { id: string; email: string; plan: string }) {
  const payload: AuthPayload = { userId: user.id, email: user.email, plan: user.plan };
  const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: ENV.JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, ENV.JWT_SECRET, { expiresIn: ENV.JWT_REFRESH_EXPIRES_IN });
  return { token, refreshToken };
}

router.post('/register', validate(registerSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, password, fullName, stateOfResidence, timezone } = req.body;
  const existing = db.selectOne('users', (u: any) => u.email === email);
  if (existing) {
    res.status(409).json({ error: 'Email already registered', code: 'EMAIL_EXISTS' });
    return;
  }

  const id = uuid();
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();

  db.insert('users', {
    id, email, password_hash: passwordHash, full_name: fullName,
    state_of_residence: stateOfResidence, timezone, plan: 'free',
    mfa_enabled: 0, onboarding_complete: 0,
    created_at: now, updated_at: now,
  });

  const user = { id, email, plan: 'free' };
  const tokens = generateTokens(user);
  logger.info({ userId: id }, 'User registered');
  res.status(201).json({ user: { id, email, fullName, plan: 'free', stateOfResidence }, ...tokens });
}));

router.post('/login', validate(loginSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const row = db.selectOne('users', (u: any) => u.email === email);
  if (!row) {
    res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    return;
  }

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    return;
  }

  if (row.mfa_enabled) {
    const tempToken = jwt.sign({ userId: row.id, mfaRequired: true }, ENV.JWT_SECRET, { expiresIn: '5m' });
    res.json({ mfaRequired: true, tempToken });
    return;
  }

  const tokens = generateTokens({ id: row.id, email: row.email, plan: row.plan });
  res.json({
    user: { id: row.id, email: row.email, fullName: row.full_name, plan: row.plan, stateOfResidence: row.state_of_residence },
    ...tokens,
  });
}));

router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required', code: 'TOKEN_REQUIRED' });
    return;
  }
  try {
    const payload = jwt.verify(refreshToken, ENV.JWT_SECRET) as any;
    if (payload.type !== 'refresh') {
      res.status(401).json({ error: 'Invalid token type', code: 'INVALID_TOKEN' });
      return;
    }
    const row = db.selectOne('users', (u: any) => u.id === payload.userId);
    if (!row) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }
    const tokens = generateTokens({ id: row.id, email: row.email, plan: row.plan });
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_TOKEN' });
  }
}));

router.post('/mfa/setup', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(req.user!.email, 'DebtWise', secret);
  db.update('users', (u: any) => u.id === req.user!.userId, { mfa_secret: secret });
  res.json({ secret, otpauth });
}));

router.post('/mfa/verify', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  const row = db.selectOne('users', (u: any) => u.id === req.user!.userId);
  if (!row?.mfa_secret) {
    res.status(400).json({ error: 'MFA not setup', code: 'MFA_NOT_SETUP' });
    return;
  }
  const valid = authenticator.verify({ token, secret: row.mfa_secret });
  if (!valid) {
    res.status(401).json({ error: 'Invalid MFA token', code: 'INVALID_MFA' });
    return;
  }
  db.update('users', (u: any) => u.id === req.user!.userId, { mfa_enabled: 1 });
  res.json({ message: 'MFA enabled successfully' });
}));

router.get('/me', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const row = db.selectOne('users', (u: any) => u.id === req.user!.userId);
  if (!row) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    id: row.id, email: row.email, fullName: row.full_name, plan: row.plan,
    stateOfResidence: row.state_of_residence, timezone: row.timezone,
    mfaEnabled: !!row.mfa_enabled, onboardingComplete: !!row.onboarding_complete,
    createdAt: row.created_at,
  });
}));

router.put('/me', authenticate, validate(z.object({
  fullName: z.string().min(1).max(100).optional(),
  stateOfResidence: z.string().length(2).optional(),
  timezone: z.string().optional(),
  onboardingComplete: z.boolean().optional(),
})), asyncHandler(async (req: Request, res: Response) => {
  const updates: any = {};
  if (req.body.fullName !== undefined) updates.full_name = req.body.fullName;
  if (req.body.stateOfResidence !== undefined) updates.state_of_residence = req.body.stateOfResidence;
  if (req.body.timezone !== undefined) updates.timezone = req.body.timezone;
  if (req.body.onboardingComplete !== undefined) updates.onboarding_complete = req.body.onboardingComplete ? 1 : 0;
  updates.updated_at = new Date().toISOString();
  db.update('users', (u: any) => u.id === req.user!.userId, updates);
  res.json({ message: 'Profile updated' });
}));

export default router;
