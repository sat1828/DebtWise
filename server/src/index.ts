import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { ENV, logger, initDb, closeDb } from './config';
import { migrate } from './db/migrate';
import { seed } from './db/seed';
import { errorHandler } from './middleware/validate';
import authRoutes from './routes/auth';
import debtRoutes from './routes/debts';
import negotiationRoutes from './routes/negotiations';
import documentRoutes from './routes/documents';
import aiRoutes from './routes/ai';
import deadlineRoutes from './routes/deadlines';
import integrationRoutes from './routes/integrations';

const app = express();

function main() {
  // Initialize database
  initDb();
  migrate();
  seed();

  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: ENV.CORS_ORIGIN, methods: ['GET', 'POST'] },
  });

  // Security
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: ENV.CORS_ORIGIN, credentials: true }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Serve static frontend
  app.use(express.static(path.join(__dirname, '../../client/dist')));

  // Request logging
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, path: req.path }, 'Request');
    next();
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/debts', debtRoutes);
  app.use('/api', negotiationRoutes);
  app.use('/api', documentRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/deadlines', deadlineRoutes);
  app.use('/api', integrationRoutes);

  // SPA fallback
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });

  // Error handler
  app.use(errorHandler);

  // WebSocket for Call Companion
  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'WebSocket connected');

    socket.on('call:join', (data) => {
      const { userId, debtId } = data;
      socket.join(`user:${userId}`);
      socket.join(`debt:${debtId}`);
      logger.info({ userId, debtId }, 'User joined call companion');
      socket.emit('call:ready', { message: 'DebtWise Call Companion active. I\'m listening — type what the collector says and I\'ll help you respond.' });
    });

    socket.on('call:transcript', (data) => {
      const { text } = data;
      setTimeout(() => {
        const responses = [
          { suggested: '"I need to review that in writing before I can agree."', reason: 'Never agree to terms verbally. Get everything in writing first.' },
          { suggested: '"Can you please send me documentation of what you\'re claiming?"', reason: 'You have the right to debt validation under FDCPA § 1692g.' },
          { suggested: '"I\'m not able to discuss payment methods over the phone."', reason: 'Never give bank account info during a call.' },
          { suggested: '"I understand. Please note our conversation for your records."', reason: 'Stay neutral and document everything.' },
        ];
        const response = responses[Math.floor(Math.random() * responses.length)]!;
        socket.emit('call:suggestion', response);
      }, 800);
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'WebSocket disconnected');
    });
  });

  server.listen(ENV.PORT, () => {
    logger.info(`DebtWise API server running on port ${ENV.PORT}`);
    logger.info(`Environment: ${ENV.NODE_ENV}`);
    logger.info(`CORS origin: ${ENV.CORS_ORIGIN}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down...');
    closeDb();
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down...');
    closeDb();
    server.close(() => process.exit(0));
  });
}

main();

export default app;
