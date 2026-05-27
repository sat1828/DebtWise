import { Router, Request, Response } from 'express';
import { db } from '../config';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/validate';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const deadlines = db.select('deadlines', (dl: any) => dl.user_id === req.user!.userId)
    .map((dl: any) => {
      const debt = db.selectOne('debts', (d: any) => d.id === dl.debt_id);
      return {
        ...dl,
        original_creditor: debt?.original_creditor || null,
        debt_type: debt?.debt_type || null,
        current_claimed_amount: debt?.current_claimed_amount || null,
      };
    })
    .sort((a: any, b: any) => {
      if (a.is_resolved !== b.is_resolved) return a.is_resolved ? 1 : -1;
      return new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime();
    });
  res.json({ deadlines });
}));

router.put('/:id/resolve', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const count = db.update('deadlines', (dl: any) => dl.id === req.params.id && dl.user_id === req.user!.userId, { is_resolved: 1 });
  if (count === 0) { res.status(404).json({ error: 'Deadline not found' }); return; }
  res.json({ message: 'Deadline marked as resolved' });
}));

export default router;
