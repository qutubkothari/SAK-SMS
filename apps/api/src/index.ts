import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { routes } from './routes.js';
import { errorHandler } from './http.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.use(routes);
app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});
