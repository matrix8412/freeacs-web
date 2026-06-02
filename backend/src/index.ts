import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import pinoHttpModule from 'pino-http';
import { config, corsOrigins } from './config/env.js';
import { connectMongo, disconnectMongo } from './db/mongo.js';
import { bootstrapApplication } from './services/bootstrap.js';
import { authenticate, csrfProtection, requirePermission } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import deviceRoutes from './routes/devices.js';
import preferencesRoutes from './routes/preferences.js';
import settingsRoutes from './routes/settings.js';
import { logger } from './utils/logger.js';
import { HttpError } from './utils/http.js';

const app = express();
const pinoHttp = pinoHttpModule as unknown as (options: { logger: typeof logger }) => express.RequestHandler;

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'same-site' }
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin not allowed'));
      }
    },
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(mongoSanitize({ replaceWith: '_' }));
app.use(pinoHttp({ logger }));
app.use(
  rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    limit: config.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', authenticate, requirePermission('dashboard:read'), dashboardRoutes);
app.use('/api/devices', authenticate, csrfProtection, deviceRoutes);
app.use('/api/preferences', authenticate, csrfProtection, preferencesRoutes);
app.use('/api/settings', authenticate, csrfProtection, settingsRoutes);

app.use((_req, _res, next) => {
  next(new HttpError(404, 'Not found'));
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const httpError = error instanceof HttpError ? error : new HttpError(500, 'Internal server error');
  const status = httpError.status || 500;

  if (status >= 500) {
    logger.error({ error }, 'Unhandled request error');
  }

  res.status(status).json({
    error: httpError.message,
    details: httpError.details
  });
});

let server: ReturnType<typeof app.listen>;

async function start() {
  try {
    await connectMongo();
    await bootstrapApplication();
    server = app.listen(config.PORT, () => {
      logger.info({ port: config.PORT }, 'Backend API started');
    });
  } catch (error) {
    logger.error({ error }, 'Backend failed to start');
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down backend');
  if (!server) {
    await disconnectMongo();
    process.exit(0);
  }

  server.close(async () => {
    await disconnectMongo();
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

void start();
