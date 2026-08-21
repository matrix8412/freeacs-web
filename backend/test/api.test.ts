import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

let app: typeof import('../src/index.js').app;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = 'mongodb://localhost:27017/test';
  process.env.ACS_NBI_URL = 'http://localhost:7557';
  process.env.ACS_CWMP_PUBLIC_URL = 'http://localhost:7547';
  process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters-long';
  process.env.INITIAL_ADMIN_EMAIL = 'admin@example.com';
  process.env.INITIAL_ADMIN_PASSWORD = 'test-password-long-enough';
  process.env.COOKIE_SECURE = 'false';

  ({ app } = await import('../src/index.js'));
});

describe('API contract', () => {
  it('returns a liveness response without requiring MongoDB', async () => {
    const response = await request(app).get('/healthz');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('rejects malformed login input with a client error', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: '' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  it('protects device inventory endpoints', async () => {
    const response = await request(app).get('/api/devices');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Authentication required');
  });

  it('returns a JSON 404 for unknown endpoints', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not found');
  });
});
