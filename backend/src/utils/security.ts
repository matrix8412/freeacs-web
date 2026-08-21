import crypto from 'node:crypto';
import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const authCookie = 'access_token';
const csrfCookie = 'csrf_token';

export type AuthTokenPayload = {
  sub: string;
  csrf: string;
};

export function isAuthTokenPayload(value: unknown): value is AuthTokenPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  return typeof payload.sub === 'string' && payload.sub.length > 0 && typeof payload.csrf === 'string' && payload.csrf.length > 0;
}

export function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function signToken(userId: string, csrf: string) {
  return jwt.sign({ sub: userId, csrf }, config.JWT_SECRET, {
    expiresIn: config.SESSION_TTL_SECONDS
  });
}

export function setAuthCookies(res: Response, userId: string) {
  const csrf = randomToken();
  const token = signToken(userId, csrf);
  const maxAge = config.SESSION_TTL_SECONDS * 1000;

  res.cookie(authCookie, token, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: 'strict',
    maxAge,
    path: '/'
  });

  res.cookie(csrfCookie, csrf, {
    httpOnly: false,
    secure: config.COOKIE_SECURE,
    sameSite: 'strict',
    maxAge,
    path: '/'
  });

  return csrf;
}

export function clearAuthCookies(res: Response) {
  const options = {
    secure: config.COOKIE_SECURE,
    sameSite: 'strict' as const,
    path: '/'
  };

  res.clearCookie(authCookie, { ...options, httpOnly: true });
  res.clearCookie(csrfCookie, { ...options, httpOnly: false });
}

export function extractBearerToken(header?: string) {
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length);
}

export const cookieNames = {
  authCookie,
  csrfCookie
};
