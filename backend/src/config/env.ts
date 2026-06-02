import { z } from 'zod';

const booleanFromEnv = z.preprocess((value) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  PORT: z.coerce.number().int().positive().default(8080),
  MONGO_URI: z.string().min(1),
  APP_DB_NAME: z.string().min(1).default('freeacs_control'),
  ACS_NBI_URL: z.string().url(),
  ACS_CWMP_PUBLIC_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  COOKIE_SECURE: booleanFromEnv.default(true),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:8080'),
  SESSION_TTL_SECONDS: z.coerce.number().int().min(900).default(28800),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(10).default(300),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(3).default(5),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  INITIAL_ADMIN_EMAIL: z.string().email(),
  INITIAL_ADMIN_PASSWORD: z.string().min(12)
});

export const config = envSchema.parse(process.env);

export const corsOrigins = config.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

