import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { db, logger } from '../config';
import { authenticate, requirePlan } from '../middleware/auth';
import { validate, asyncHandler } from '../middleware/validate';

const router = Router();

router.post('/plaid/link-token', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  res.json({ linkToken: 'plaid-link-token-' + uuid(), expiration: new Date(Date.now() + 3600000).toISOString() });
}));

router.post('/plaid/exchange-token', authenticate, validate(z.object({ publicToken: z.string() })), asyncHandler(async (req: Request, res: Response) => {
  db.insert('plaid_connections', {
    id: uuid(), user_id: req.user!.userId,
    access_token: 'access-sandbox-' + uuid(),
    item_id: 'item-' + uuid(),
    is_active: 1, created_at: new Date().toISOString(),
  });
  logger.info({ userId: req.user!.userId }, 'Plaid connected');
  res.json({ status: 'connected' });
}));

router.get('/plaid/income-analysis', authenticate, requirePlan('pro', 'premium'), asyncHandler(async (req: Request, res: Response) => {
  const conn = db.selectOne('plaid_connections', (c: any) => c.user_id === req.user!.userId && c.is_active);
  if (!conn) { res.status(404).json({ error: 'No Plaid connection', code: 'PLAID_NOT_CONNECTED' }); return; }
  res.json({
    monthlyIncome: 4850, monthlyExpenses: 3200, discretionaryIncome: 1650,
    incomeStability: 'moderate', recommendedMaxPayment: 500,
    transactionSummary: {
      totalCredits: 4850, totalDebits: 3200,
      largestExpenseCategories: ['Rent/Mortgage', 'Groceries', 'Transportation'],
      averageDailyBalance: 1240,
    },
    analyzedPeriod: { start: '2024-10-01', end: '2024-12-31' },
  });
}));

router.delete('/plaid/disconnect', authenticate, asyncHandler(async (req: Request, res: Response) => {
  db.update('plaid_connections', (c: any) => c.user_id === req.user!.userId, { is_active: 0 });
  res.json({ message: 'Plaid disconnected' });
}));

router.post('/stripe/create-checkout', authenticate, validate(z.object({
  plan: z.enum(['pro', 'premium']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})), asyncHandler(async (req: Request, res: Response) => {
  const { plan } = req.body;
  const priceMap: Record<string, number> = { pro: 999, premium: 2499 };
  const amount = priceMap[plan as string] || 999;
  res.json({
    url: `/api/stripe/checkout?plan=${plan}&amount=${amount}&userId=${req.user!.userId}`,
    checkoutSessionId: 'cs_' + uuid(), amount, currency: 'usd',
  });
}));

router.post('/stripe/webhook', asyncHandler(async (req: Request, res: Response) => {
  logger.info({ eventType: req.body.type }, 'Stripe webhook received');
  res.json({ received: true });
}));

router.get('/subscription', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const sub = db.selectOne('subscriptions', (s: any) => s.user_id === req.user!.userId);
  res.json({ subscription: sub || { plan: 'free', status: 'active' } });
}));

router.post('/alerts/preferences', authenticate, validate(z.object({
  smsEnabled: z.boolean().default(false),
  emailEnabled: z.boolean().default(true),
  phoneNumber: z.string().optional(),
})), asyncHandler(async (req: Request, res: Response) => {
  db.update('users', (u: any) => u.id === req.user!.userId, { alert_preferences: JSON.stringify(req.body) });
  res.json({ message: 'Alert preferences saved' });
}));

export default router;
