import express from 'express';
import cors from 'cors';
import { allowedOrigins, isProduction } from './config/security.js';
import authRoutes from './routes/authRoutes.js';
import progressRoutes from './routes/progressRoutes.js';

const app = express();

app.use(cors((req, callback) => {
  const origin = req.get('Origin');
  if (!origin) {
    callback(null, { origin: false });
    return;
  }

  let allowed = allowedOrigins.has(origin);
  try {
    const parsedOrigin = new URL(origin);
    const sameHost = parsedOrigin.host === req.get('host');
    const validScheme = parsedOrigin.protocol === 'https:' || !isProduction;
    allowed ||= sameHost && validScheme;
  } catch {
    allowed = false;
  }
  callback(null, { origin: allowed ? origin : false });
}));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'KidCode Neiva API Operativa' });
});

app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);

export default app;
