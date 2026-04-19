import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import questsRouter, { submissionsRouter } from './routes/quests.js';
import disputesRouter from './routes/disputes.js';
import transactionsRouter from './routes/transactions.js';
import { secureHeaders } from './middleware/secureHeaders.js';
import { csrfProtection, csrfTokenHandler } from './middleware/csrf.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Security headers on every response (Requirement 27.3)
app.use(secureHeaders);

// CSRF token endpoint — must be registered before the CSRF protection
// middleware so that clients can obtain a token without being blocked.
app.get('/api/auth/csrf-token', csrfTokenHandler);

// CSRF protection on all state-changing requests (Requirement 27.2)
app.use(csrfProtection);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'quest-at-stellar-backend' });
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/quests', questsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api', disputesRouter);
app.use('/api/transactions', transactionsRouter);

app.listen(PORT, () => {
  console.log(`Quest@Stellar backend running on port ${PORT}`);
});

export default app;
