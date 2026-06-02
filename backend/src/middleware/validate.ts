import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';
import { HttpError } from '../utils/http.js';

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(new HttpError(400, 'Validation failed', parsed.error.flatten()));
    }

    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return next(new HttpError(400, 'Validation failed', parsed.error.flatten()));
    }

    (req as any).validatedQuery = parsed.data;
    next();
  };
}

