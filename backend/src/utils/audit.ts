import type { Request } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { logger } from './logger.js';

export async function audit(req: Request, action: string, resource: string, details?: unknown) {
  const user = req.user;

  try {
    await AuditLog.create({
      actorId: user?._id,
      actorEmail: user?.email || 'anonymous',
      action,
      resource,
      details,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  } catch (error) {
    logger.warn({ error }, 'Unable to write audit log');
  }
}
