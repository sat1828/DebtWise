import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { db } from '../config';
import { authenticate } from '../middleware/auth';
import { validate, asyncHandler } from '../middleware/validate';
import { runDebtAnalysis, generateDocumentContent } from '../ai/debtAnalysis';

const router = Router();

const generateDocSchema = z.object({
  type: z.enum(['debt_validation_request', 'cease_and_desist', 'settlement_offer', 'dispute_letter', 'violation_complaint', 'call_script', 'payment_plan_proposal']),
});

const updateDocSchema = z.object({
  sentAt: z.string().optional(),
  sentVia: z.enum(['certified_mail', 'email', 'fax', 'portal']).optional(),
});

router.get('/debts/:debtId/documents', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const docs = db.select('documents', (d: any) => d.debt_id === req.params.debtId && d.user_id === req.user!.userId)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ documents: docs });
}));

router.post('/debts/:debtId/documents', authenticate, validate(generateDocSchema), asyncHandler(async (req: Request, res: Response) => {
  const debt = db.selectOne('debts', (d: any) => d.id === req.params.debtId && d.user_id === req.user!.userId);
  if (!debt) { res.status(404).json({ error: 'Debt not found' }); return; }

  const user = db.selectOne('users', (u: any) => u.id === req.user!.userId)!;
  const analysis = await runDebtAnalysis(debt, user.state_of_residence);
  const content = await generateDocumentContent(req.body.type, debt, analysis, user);

  const id = uuid();
  const doc = {
    id, debt_id: req.params.debtId, user_id: req.user!.userId,
    type: req.body.type, content_markdown: content,
    content_pdf_url: null, sent_at: null, sent_via: null,
    created_at: new Date().toISOString(),
  };
  db.insert('documents', doc);
  res.status(201).json({ document: doc });
}));

router.put('/documents/:id', authenticate, validate(updateDocSchema), asyncHandler(async (req: Request, res: Response) => {
  const existing = db.selectOne('documents', (d: any) => d.id === req.params.id && d.user_id === req.user!.userId);
  if (!existing) { res.status(404).json({ error: 'Document not found' }); return; }

  const updates: any = {};
  if (req.body.sentAt) updates.sent_at = req.body.sentAt;
  if (req.body.sentVia) updates.sent_via = req.body.sentVia;
  db.update('documents', (d: any) => d.id === req.params.id, updates);

  const doc = db.selectOne('documents', (d: any) => d.id === req.params.id);
  res.json({ document: doc });
}));

router.get('/documents/:id/pdf', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const doc = db.selectOne('documents', (d: any) => d.id === req.params.id && d.user_id === req.user!.userId);
  if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="${doc.type}_${doc.id.slice(0, 8)}.md"`);
  res.send(doc.content_markdown);
}));

export default router;
