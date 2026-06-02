import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { acsService } from '../services/acs.js';
import { audit } from '../utils/audit.js';
import { routeParam } from '../utils/params.js';

const router = Router();

const querySchema = z.object({
  search: z.string().trim().max(120).optional(),
  tag: z.string().trim().max(80).optional(),
  status: z.enum(['all', 'online', 'offline']).default('all'),
  limit: z.coerce.number().int().min(1).max(500).default(100)
});

const taskSchema = z.object({
  action: z.enum(['refresh', 'reboot', 'factoryReset', 'setParameterValues']),
  connectionRequest: z.boolean().default(true),
  parameterPath: z.string().trim().max(300).optional(),
  parameterValue: z.union([z.string().max(1000), z.number(), z.boolean()]).optional(),
  parameterType: z.enum(['xsd:string', 'xsd:boolean', 'xsd:int', 'xsd:unsignedInt', 'xsd:dateTime']).default('xsd:string')
});

router.get('/', requirePermission('devices:read'), validateQuery(querySchema), async (req, res, next) => {
  try {
    const devices = await acsService.listDevices((req as any).validatedQuery);
    res.json({ devices });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requirePermission('devices:read'), async (req, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const device = await acsService.getDevice(id);
    res.json({ device });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/tasks', requirePermission('devices:write'), validateBody(taskSchema), async (req, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const task = await acsService.createTask(id, req.body);
    await audit(req, `device.${req.body.action}`, `device:${id}`, req.body);
    res.status(202).json({ task });
  } catch (error) {
    next(error);
  }
});

export default router;
