import { db, logger } from '../config';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

export function seed(): void {
  if (db.count('users') > 0) {
    logger.info('Database already seeded, skipping');
    return;
  }

  logger.info('Seeding database...');

  const userId = uuid();
  const hash = bcrypt.hashSync('password123', 10);

  db.insert('users', {
    id: userId,
    email: 'demo@debtwise.ai',
    password_hash: hash,
    state_of_residence: 'CA',
    timezone: 'America/Los_Angeles',
    plan: 'pro',
    mfa_enabled: 0,
    onboarding_complete: 1,
    full_name: 'Alex Rivera',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const debt1Id = uuid();
  const debt2Id = uuid();

  db.insert('debts', {
    id: debt1Id,
    user_id: userId,
    original_creditor: 'Capital One',
    current_collector: 'Midland Credit Management',
    account_number_last4: '4321',
    debt_type: 'credit_card',
    original_amount: 3200.00,
    current_claimed_amount: 4785.43,
    interest_claimed: 985.43,
    fees_claimed: 600.00,
    date_of_last_payment: '2022-03-15',
    date_of_default: '2022-04-01',
    date_first_delinquent: '2022-02-15',
    collection_notice_date: '2024-01-10',
    status: 'disputed',
    statute_of_limitations_expires_on: '2028-04-01',
    is_time_barred: 0,
    legal_risk_score: 35,
    collector_violations: JSON.stringify([
      { type: 'calling_outside_hours', description: 'Called at 7:15 AM (before 8 AM)', date: '2024-01-15', statute: 'FDCPA § 1692c(a)(1)' },
      { type: 'failure_to_validate', description: 'No validation notice sent within 5 days of first contact', date: '2024-01-10', statute: 'FDCPA § 1692g' }
    ]),
    ai_analysis_summary: 'This credit card debt from Capital One was sold to Midland Credit Management. The debt is within the 4-year California statute of limitations (expires April 2028). Two potential FDCPA violations detected: calls outside permissible hours and failure to send validation notice. Settlement recommended in the range of $1,500-$2,000 (30-42% of claimed amount).',
    source_type: 'manual',
    session_count: 0,
    active_deadlines: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  db.insert('debts', {
    id: debt2Id,
    user_id: userId,
    original_creditor: 'Sutter Health',
    current_collector: 'NCB Management Services',
    account_number_last4: '8765',
    debt_type: 'medical',
    original_amount: 5400.00,
    current_claimed_amount: 5400.00,
    interest_claimed: 0,
    fees_claimed: 0,
    date_of_last_payment: '2019-11-20',
    date_of_default: '2020-01-15',
    date_first_delinquent: '2019-12-01',
    collection_notice_date: '2024-02-01',
    status: 'time_barred',
    statute_of_limitations_expires_on: '2024-01-15',
    is_time_barred: 1,
    legal_risk_score: 15,
    collector_violations: JSON.stringify([
      { type: 'threatening_lawsuit_time_barred', description: 'Threatened lawsuit on time-barred debt', date: '2024-02-05', statute: 'FDCPA § 1692e, Reg F' }
    ]),
    ai_analysis_summary: 'This medical debt from Sutter Health is TIME-BARRED under California law (4-year SOL expired January 2024). The collector cannot legally sue for this debt. A threat to sue on time-barred debt is an FDCPA violation. You have maximum leverage — a cease and desist letter would be highly effective.',
    source_type: 'manual',
    session_count: 0,
    active_deadlines: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  db.insert('deadlines', {
    id: uuid(),
    debt_id: debt1Id,
    user_id: userId,
    deadline_date: '2024-02-09',
    type: 'fdcpa_dispute_window',
    description: '30-day FDCPA dispute window closes — must send debt validation request by this date',
    is_resolved: 0,
    reminder_sent_at: null,
  });

  db.insert('deadlines', {
    id: uuid(),
    debt_id: debt2Id,
    user_id: userId,
    deadline_date: '2024-03-01',
    type: 'statute_of_limitations_reset_risk',
    description: 'WARNING: Any payment on this time-barred debt could restart the statute of limitations',
    is_resolved: 0,
    reminder_sent_at: null,
  });

  db.insert('ai_threads', {
    id: uuid(),
    debt_id: debt1Id,
    user_id: userId,
    thread_type: 'analysis',
    messages: JSON.stringify([
      { role: 'user', content: 'I received this collection notice from Midland Credit Management about an old Capital One card. What should I do?', timestamp: new Date().toISOString() },
      { role: 'assistant', content: "I've analyzed your debt situation. Here's what I found:\n\n1. **Validation Status**: Midland Credit Management is a third-party debt collector who purchased your Capital One debt. You have the right to request debt validation under FDCPA § 1692g within 30 days of their first contact.\n\n2. **Statute of Limitations**: California has a 4-year SOL for credit card debt. Your last payment was March 2022, so the SOL expires around April 2028. This debt is NOT time-barred.\n\n3. **Violations Detected**: I found 2 potential FDCPA violations:\n   - Collection call at 7:15 AM (before 8 AM) — violates § 1692c(a)(1)\n   - No validation notice sent — violates § 1692g\n\n4. **Recommended Action**: Send a Debt Validation Letter via Certified Mail immediately. Use these violations as leverage in settlement negotiations.", timestamp: new Date().toISOString() }
    ]),
    context_snapshot: '{}',
    created_at: new Date().toISOString(),
  });

  logger.info('Database seeded successfully with demo data');
}

if (require.main === module) {
  seed();
}
