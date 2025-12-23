import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { routes } from './routes.js';
import { errorHandler } from './http.js';
import { sakWebhookRouter } from './whatsapp/sakWebhook.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));

// Middleware to capture raw body for webhook signature verification
app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '2mb' }), (req, res, next) => {
  (req as any).rawBody = req.body;
  req.body = JSON.parse(req.body.toString('utf8'));
  next();
});

app.use(express.json({ limit: '2mb' }));

app.use('/api/webhooks', sakWebhookRouter);
app.use(routes);
app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});
