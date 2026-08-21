import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import type { Permission } from '../config/permissions.js';
import { User } from '../models/User.js';
import { cookieNames, extractBearerToken, isAuthTokenPayload } from '../utils/security.js';
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

    const decoded = jwt.verify(token, config.JWT_SECRET);
    if (!isAuthTokenPayload(decoded)) {
      throw new HttpError(401, 'Authentication required');
    }
    const payload = decoded;
    const user = await User.findById(payload.sub).populate('groupIds');

    if (!user || user.status !== 'active') {
      throw new HttpError(401, 'Authentication required');
    }

    req.user = user;
    req.csrfToken = payload.csrf;
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, 'Authentication required'));
  }
}

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!hasPermission(req.user, permission)) {
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
  const csrfToken = req.csrfToken;

  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie || csrfHeader !== csrfToken) {
    return next(new HttpError(403, 'Invalid CSRF token'));
  }

  next();
}
