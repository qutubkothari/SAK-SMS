import 'dotenv/config';
import { loadConfig } from './config.js';
import { prisma } from './db.js';
import { WhatsAppCommunicator } from './whatsapp/WhatsAppCommunicator.js';
import { buildApp } from './http/app.js';

const config = loadConfig();

const communicator = new WhatsAppCommunicator({
  prisma,
  sakBaseUrl: config.SAK_BASE_URL,
});

const app = buildApp({ config, communicator });

app.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on :${config.PORT}`);
});
