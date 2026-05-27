import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function env(key: string, fallback?: string): string {
  const val = process.env[key] || fallback;
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  DATABASE_URL: env('DATABASE_URL', './debtwise.db'),
  JWT_SECRET: env('JWT_SECRET', 'dev-secret-change-in-production-32chars'),
  JWT_EXPIRES_IN: '24h',
  JWT_REFRESH_EXPIRES_IN: '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID || '',
  PLAID_SECRET: process.env.PLAID_SECRET || '',
  PLAID_ENV: process.env.PLAID_ENV || 'sandbox',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  REDIS_URL: process.env.REDIS_URL || '',
  SENTRY_DSN: process.env.SENTRY_DSN || '',
  POSTHOG_API_KEY: process.env.POSTHOG_API_KEY || '',
} as const;

export type Env = typeof ENV;
