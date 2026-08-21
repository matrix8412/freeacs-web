import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { acsService } from '../services/acs.js';
import { audit } from '../utils/audit.js';
import { routeParam } from '../utils/params.js';

const router = Router();

const tagSchema = z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9_.:-]+$/, 'Invalid tag format');

const querySchema = z.object({
  search: z.string().trim().max(120).optional(),
  tag: tagSchema.optional(),
  status: z.enum(['all', 'online', 'offline']).default('all'),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
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
    const result = await acsService.listDevices(req.validatedQuery as z.infer<typeof querySchema>);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/:id(*)/tags/:tag', requirePermission('devices:write'), async (req, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const tag = tagSchema.parse(req.params.tag);
    const device = await acsService.addTag(id, tag);
    await audit(req, 'device.tag.add', `device:${id}`, { tag });
    res.json({ device });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id(*)/tags/:tag', requirePermission('devices:write'), async (req, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const tag = tagSchema.parse(req.params.tag);
    const device = await acsService.removeTag(id, tag);
    await audit(req, 'device.tag.remove', `device:${id}`, { tag });
    res.json({ device });
  } catch (error) {
    next(error);
  }
});

router.get('/:id(*)', requirePermission('devices:read'), async (req, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const device = await acsService.getDevice(id);
    res.json({ device });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id(*)', requirePermission('devices:write'), async (req, res, next) => {
  try {
    const id = routeParam(req.params.id);
    await acsService.deleteDevice(id);
    await audit(req, 'device.delete', `device:${id}`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/:id(*)/tasks', requirePermission('devices:write'), validateBody(taskSchema), async (req, res, next) => {
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
