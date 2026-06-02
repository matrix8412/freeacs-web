import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import type { Permission } from '../config/permissions.js';
import { User } from '../models/User.js';
import { cookieNames, extractBearerToken, type AuthTokenPayload } from '../utils/security.js';
import { hasPermission } from '../utils/serialize.js';
import { HttpError } from '../utils/http.js';

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const cookieToken = req.cookies?.[cookieNames.authCookie];
    const bearerToken = extractBearerToken(req.get('authorization'));
    const token = cookieToken || bearerToken;

    if (!token) {
      throw new HttpError(401, 'Authentication required');
    }

    const payload = jwt.verify(token, config.JWT_SECRET) as AuthTokenPayload;
    const user = await User.findById(payload.sub).populate('groupIds');

    if (!user || user.status !== 'active') {
      throw new HttpError(401, 'Authentication required');
    }

    (req as any).user = user;
    (req as any).csrfToken = payload.csrf;
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, 'Authentication required'));
  }
}

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!hasPermission((req as any).user, permission)) {
      return next(new HttpError(403, 'Permission denied'));
    }

    next();
  };
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const csrfHeader = req.get('x-csrf-token');
  const csrfCookie = req.cookies?.[cookieNames.csrfCookie];
  const csrfToken = (req as any).csrfToken;

  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie || csrfHeader !== csrfToken) {
    return next(new HttpError(403, 'Invalid CSRF token'));
  }

  next();
}

