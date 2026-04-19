import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import questsRouter, { submissionsRouter } from './routes/quests.js';
import { secureHeaders } from './middleware/secureHeaders.js';
import { csrfProtection, csrfTokenHandler } from './middleware/csrf.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(secureHeaders);
app.get('/api/auth/csrf-token', csrfTokenHandler);
app.use(csrfProtection);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'quest-at-stellar-backend' });
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/quests', questsRouter);
app.use('/api/submissions', submissionsRouter);

app.listen(PORT, () => {
  console.log(`Quest@Stellar backend running on port ${PORT}`);
});

export default app;
