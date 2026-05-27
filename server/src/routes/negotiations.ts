import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { db } from '../config';
import { authenticate } from '../middleware/auth';
import { validate, asyncHandler } from '../middleware/validate';

const router = Router();

const createSessionSchema = z.object({
  goal: z.enum(['full_settlement', 'payment_plan', 'dispute_validity', 'cease_and_desist', 'statute_defense', 'violation_leverage']),
  userMaxLumpSum: z.number().positive().optional(),
  userMonthlyIncome: z.number().positive().optional(),
  userMaxMonthlyPayment: z.number().positive().optional(),
});

const updateSessionSchema = z.object({
  status: z.enum(['open', 'offer_made', 'counter_received', 'settled', 'abandoned']).optional(),
  finalSettlementAmount: z.number().positive().optional(),
  finalPaymentPlan: z.array(z.object({ amount: z.number(), dueDate: z.string(), paid: z.boolean().default(false) })).optional(),
});

const logContactSchema = z.object({
  date: z.string(),
  contactPerson: z.string().optional(),
  notes: z.string().max(5000),
  outcome: z.string().max(1000).optional(),
});

router.get('/debts/:debtId/sessions', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const debt = db.selectOne('debts', (d: any) => d.id === req.params.debtId && d.user_id === req.user!.userId);
  if (!debt) { res.status(404).json({ error: 'Debt not found' }); return; }
  const sessions = db.select('negotiation_sessions', (s: any) => s.debt_id === req.params.debtId)
    .map((s: any) => ({ ...s, contacts: tryParseJSON(s.contacts, []), finalPaymentPlan: tryParseJSON(s.final_payment_plan, []) }))
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ sessions });
}));

router.post('/debts/:debtId/sessions', authenticate, validate(createSessionSchema), asyncHandler(async (req: Request, res: Response) => {
  const debt = db.selectOne('debts', (d: any) => d.id === req.params.debtId && d.user_id === req.user!.userId);
  if (!debt) { res.status(404).json({ error: 'Debt not found' }); return; }

  const id = uuid();
  const data = req.body;
  const session: any = {
    id, debt_id: req.params.debtId, user_id: req.user!.userId,
    goal: data.goal, status: 'open',
    user_max_lump_sum: data.userMaxLumpSum || null,
    user_monthly_income: data.userMonthlyIncome || null,
    user_max_monthly_payment: data.userMaxMonthlyPayment || null,
    final_settlement_amount: null,
    final_payment_plan: '[]',
    contacts: '[]',
    created_at: new Date().toISOString(),
  };

  db.insert('negotiation_sessions', session);
  res.status(201).json({ session: { ...session, contacts: [], finalPaymentPlan: [] } });
}));

router.put('/debts/:debtId/sessions/:sessionId', authenticate, validate(updateSessionSchema), asyncHandler(async (req: Request, res: Response) => {
  const existing = db.selectOne('negotiation_sessions', (s: any) => s.id === req.params.sessionId && s.debt_id === req.params.debtId && s.user_id === req.user!.userId);
  if (!existing) { res.status(404).json({ error: 'Session not found' }); return; }

  const updates: any = {};
  if (req.body.status) updates.status = req.body.status;
  if (req.body.finalSettlementAmount !== undefined) updates.final_settlement_amount = req.body.finalSettlementAmount;
  if (req.body.finalPaymentPlan) updates.final_payment_plan = JSON.stringify(req.body.finalPaymentPlan);

  db.update('negotiation_sessions', (s: any) => s.id === req.params.sessionId, updates);
  const session = db.selectOne('negotiation_sessions', (s: any) => s.id === req.params.sessionId);
  res.json({ session: { ...session, contacts: tryParseJSON(session.contacts, []), finalPaymentPlan: tryParseJSON(session.final_payment_plan, []) } });
}));

router.post('/debts/:debtId/sessions/:sessionId/contact', authenticate, validate(logContactSchema), asyncHandler(async (req: Request, res: Response) => {
  const session = db.selectOne('negotiation_sessions', (s: any) => s.id === req.params.sessionId && s.debt_id === req.params.debtId && s.user_id === req.user!.userId);
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

  const contacts = tryParseJSON(session.contacts, []);
  contacts.push({ id: uuid(), ...req.body, createdAt: new Date().toISOString() });
  db.update('negotiation_sessions', (s: any) => s.id === req.params.sessionId, { contacts: JSON.stringify(contacts) });
  res.status(201).json({ contacts });
}));

function tryParseJSON(str: any, fallback: any): any {
  try { return JSON.parse(str); } catch { return fallback; }
}

export default router;
