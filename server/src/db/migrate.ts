import { db, logger } from '../config';

export function migrate(): void {
  db.table.create('users', true);
  db.table.create('debts', true);
  db.table.create('negotiation_sessions', true);
  db.table.create('documents', true);
  db.table.create('deadlines', true);
  db.table.create('ai_threads', true);
  db.table.create('plaid_connections', true);
  db.table.create('subscriptions', true);

  // Create indexes via metadata
  logger.info('Database schema initialized');
}
