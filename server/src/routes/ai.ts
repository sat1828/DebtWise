import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { db, logger } from '../config';
import { authenticate } from '../middleware/auth';
import { validate, asyncHandler } from '../middleware/validate';
import { getChatResponse } from '../ai/debtAnalysis';

const router = Router();

const chatSchema = z.object({
  debtId: z.string().optional(),
  threadId: z.string().optional(),
  message: z.string().min(1).max(10000),
});

router.post('/chat', authenticate, validate(chatSchema), asyncHandler(async (req: Request, res: Response) => {
  const { debtId, threadId, message } = req.body;

  let thread: any;

  if (threadId) {
    thread = db.selectOne('ai_threads', (t: any) => t.id === threadId && t.user_id === req.user!.userId);
    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }
  } else {
    const newId = uuid();
    const user = db.selectOne('users', (u: any) => u.id === req.user!.userId);
    let debtContext = {};
    let threadType = 'coaching';

    if (debtId) {
      const debt = db.selectOne('debts', (d: any) => d.id === debtId && d.user_id === req.user!.userId);
      if (debt) {
        debtContext = debt;
        threadType = 'coaching';
      }
    }

    thread = {
      id: newId, debt_id: debtId || null, user_id: req.user!.userId,
      thread_type: threadType, messages: '[]',
      context_snapshot: JSON.stringify(debtContext),
      created_at: new Date().toISOString(),
    };
    db.insert('ai_threads', thread);
  }

  const messages = tryParseJSON(thread.messages, []);
  messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });

  const debtContext = tryParseJSON(thread.context_snapshot, {});
  const user = db.selectOne('users', (u: any) => u.id === req.user!.userId)!;
  const aiResponse = await getChatResponse(messages, debtContext, user.state_of_residence || 'CA');
  messages.push({ role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() });

  db.update('ai_threads', (t: any) => t.id === thread.id, { messages: JSON.stringify(messages) });

  res.json({ message: { role: 'assistant', content: aiResponse, threadId: thread.id }, threadId: thread.id });
}));

router.get('/threads/:debtId', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const threads = db.select('ai_threads', (t: any) => t.debt_id === req.params.debtId && t.user_id === req.user!.userId)
    .map((t: any) => ({ ...t, messages: tryParseJSON(t.messages, []) }))
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ threads });
}));

function tryParseJSON(str: any, fallback: any): any {
  try { return JSON.parse(str); } catch { return fallback; }
}

export default router;
