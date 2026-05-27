import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { db } from '../config';
import { authenticate } from '../middleware/auth';
import { validate, asyncHandler } from '../middleware/validate';
import { runDebtAnalysis } from '../ai/debtAnalysis';

const router = Router();

const createDebtSchema = z.object({
  originalCreditor: z.string().min(1).max(200),
  currentCollector: z.string().max(200).optional(),
  accountNumberLast4: z.string().length(4).optional(),
  debtType: z.enum(['credit_card', 'medical', 'student_loan', 'auto_loan', 'personal_loan', 'utility', 'rent', 'mortgage', 'other']),
  originalAmount: z.number().positive().optional(),
  currentClaimedAmount: z.number().positive().optional(),
  interestClaimed: z.number().optional(),
  feesClaimed: z.number().optional(),
  dateOfLastPayment: z.string().optional(),
  dateOfDefault: z.string().optional(),
  dateFirstDelinquent: z.string().optional(),
  collectionNoticeDate: z.string().optional(),
  sourceType: z.enum(['manual', 'ocr_upload', 'email_parse']).default('manual'),
  notes: z.string().max(5000).optional(),
});

const updateDebtSchema = createDebtSchema.partial();

router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const debts = db.select('debts', (d: any) => d.user_id === req.user!.userId && d.status !== 'deleted')
    .map((d: any) => ({
      ...d,
      collectorViolations: tryParseJSON(d.collector_violations, []),
      isTimeBarred: !!d.is_time_barred,
      sessionCount: db.count('negotiation_sessions', (s: any) => s.debt_id === d.id),
      activeDeadlines: db.count('deadlines', (dl: any) => dl.debt_id === d.id && !dl.is_resolved),
    }))
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ debts });
}));

router.get('/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const debt = db.selectOne('debts', (d: any) => d.id === req.params.id && d.user_id === req.user!.userId);
  if (!debt) {
    res.status(404).json({ error: 'Debt not found', code: 'NOT_FOUND' });
    return;
  }

  const sessions = db.select('negotiation_sessions', (s: any) => s.debt_id === debt.id)
    .map((s: any) => ({ ...s, contacts: tryParseJSON(s.contacts, []), finalPaymentPlan: tryParseJSON(s.final_payment_plan, []) }))
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const documents = db.select('documents', (d: any) => d.debt_id === debt.id)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const deadlines = db.select('deadlines', (d: any) => d.debt_id === debt.id)
    .sort((a: any, b: any) => new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime());
  const threads = db.select('ai_threads', (t: any) => t.debt_id === debt.id)
    .map((t: any) => ({ id: t.id, created_at: t.created_at, thread_type: t.thread_type }));

  res.json({ debt: formatDebt(debt), sessions, documents, deadlines, threads });
}));

router.post('/', authenticate, validate(createDebtSchema), asyncHandler(async (req: Request, res: Response) => {
  const id = uuid();
  const data = req.body;
  const now = new Date().toISOString();

  db.insert('debts', {
    id, user_id: req.user!.userId,
    original_creditor: data.originalCreditor,
    current_collector: data.currentCollector || null,
    account_number_last4: data.accountNumberLast4 || null,
    debt_type: data.debtType,
    original_amount: data.originalAmount || null,
    current_claimed_amount: data.currentClaimedAmount || null,
    interest_claimed: data.interestClaimed || null,
    fees_claimed: data.feesClaimed || null,
    date_of_last_payment: data.dateOfLastPayment || null,
    date_of_default: data.dateOfDefault || null,
    date_first_delinquent: data.dateFirstDelinquent || null,
    collection_notice_date: data.collectionNoticeDate || null,
    source_type: data.sourceType,
    notes: data.notes || null,
    status: 'analyzing',
    is_time_barred: 0,
    collector_violations: '[]',
    created_at: now, updated_at: now,
  });

  res.status(201).json({ debt: { id, ...data, userId: req.user!.userId } });
}));

router.put('/:id', authenticate, validate(updateDebtSchema), asyncHandler(async (req: Request, res: Response) => {
  const existing = db.selectOne('debts', (d: any) => d.id === req.params.id && d.user_id === req.user!.userId);
  if (!existing) {
    res.status(404).json({ error: 'Debt not found', code: 'NOT_FOUND' });
    return;
  }

  const updates: any = { updated_at: new Date().toISOString() };
  const fieldMap: Record<string, string> = {
    originalCreditor: 'original_creditor', currentCollector: 'current_collector',
    accountNumberLast4: 'account_number_last4', debtType: 'debt_type',
    originalAmount: 'original_amount', currentClaimedAmount: 'current_claimed_amount',
    interestClaimed: 'interest_claimed', feesClaimed: 'fees_claimed',
    dateOfLastPayment: 'date_of_last_payment', dateOfDefault: 'date_of_default',
    dateFirstDelinquent: 'date_first_delinquent', collectionNoticeDate: 'collection_notice_date',
    status: 'status', notes: 'notes',
  };
  for (const [key, dbField] of Object.entries(fieldMap)) {
    if (req.body[key] !== undefined) updates[dbField] = req.body[key];
  }

  db.update('debts', (d: any) => d.id === req.params.id, updates);
  const debt = db.selectOne('debts', (d: any) => d.id === req.params.id);
  res.json({ debt: formatDebt(debt) });
}));

router.delete('/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const count = db.update('debts', (d: any) => d.id === req.params.id && d.user_id === req.user!.userId, { status: 'deleted', updated_at: new Date().toISOString() });
  if (count === 0) {
    res.status(404).json({ error: 'Debt not found', code: 'NOT_FOUND' });
    return;
  }
  res.json({ message: 'Debt deleted' });
}));

router.post('/:id/analyze', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const debt = db.selectOne('debts', (d: any) => d.id === req.params.id && d.user_id === req.user!.userId);
  if (!debt) {
    res.status(404).json({ error: 'Debt not found', code: 'NOT_FOUND' });
    return;
  }

  const user = db.selectOne('users', (u: any) => u.id === req.user!.userId)!;
  const analysis = await runDebtAnalysis(debt, user.state_of_residence);

  db.update('debts', (d: any) => d.id === debt.id, {
    status: analysis.status,
    statute_of_limitations_expires_on: analysis.solExpiresOn || null,
    is_time_barred: analysis.isTimeBarred ? 1 : 0,
    legal_risk_score: analysis.riskScore,
    collector_violations: JSON.stringify(analysis.violations),
    ai_analysis_summary: analysis.summary,
    updated_at: new Date().toISOString(),
  });

  res.json({ analysis });
}));

router.post('/upload-notice', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) {
    res.status(400).json({ error: 'Text content required', code: 'TEXT_REQUIRED' });
    return;
  }
  const extracted = {
    originalCreditor: 'Extracted Creditor',
    debtType: 'credit_card' as const,
    currentClaimedAmount: 0,
    collectionNoticeDate: new Date().toISOString().split('T')[0],
  };
  res.json({ extracted });
}));

function formatDebt(debt: any) {
  return {
    ...debt,
    isTimeBarred: !!debt.is_time_barred,
    collectorViolations: tryParseJSON(debt.collector_violations, []),
    sessionCount: debt.sessionCount || 0,
    activeDeadlines: debt.activeDeadlines || 0,
  };
}

function tryParseJSON(str: any, fallback: any): any {
  try { return JSON.parse(str); } catch { return fallback; }
}

export default router;
