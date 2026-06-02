import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Types } from 'mongoose';
import { PERMISSIONS } from '../config/permissions.js';
import { config } from '../config/env.js';
import { requirePermission } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { AppSetting } from '../models/AppSetting.js';
import { Group } from '../models/Group.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { acsService } from '../services/acs.js';
import { audit } from '../utils/audit.js';
import { HttpError } from '../utils/http.js';
import { routeParam } from '../utils/params.js';
import { serializeUser } from '../utils/serialize.js';

const router = Router();
const permissionEnum = z.enum(PERMISSIONS);

const generalSettingsSchema = z.object({
  acsPublicUrl: z.string().url(),
  informIntervalSeconds: z.number().int().min(60).max(604800),
  requireCpeAuthentication: z.boolean(),
  registrationMode: z.enum(['manual-approval', 'auto-register']),
  sessionTimeoutSeconds: z.number().int().min(900).max(86400)
});

const groupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).default(''),
  permissions: z.array(z.union([permissionEnum, z.literal('admin:*')])).default([])
});

const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(160),
  password: z.string().min(12).max(256),
  groupIds: z.array(z.string()).default([]),
  status: z.enum(['active', 'disabled']).default('active')
});

const userUpdateSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(160),
  groupIds: z.array(z.string()).default([]),
  status: z.enum(['active', 'disabled']).default('active')
});

const passwordSchema = z.object({
  password: z.string().min(12).max(256)
});

const acsNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .refine((value) => !/[/?#\\]/.test(value) && !/[\x00-\x1f\x7f]/.test(value), 'Name cannot contain slashes, URL fragments, or control characters');

const provisionSchema = z.object({
  name: acsNameSchema,
  script: z.string().max(200000).default('')
});

const presetSchema = z.object({
  name: acsNameSchema,
  channel: z.string().trim().min(1).max(80).default('default'),
  weight: z.number().int().min(-100000).max(100000).default(0),
  events: z.string().max(10000).default(''),
  precondition: z.string().max(50000).default('{}'),
  provision: acsNameSchema,
  arguments: z.string().max(50000).default('')
});

function ensureObjectIds(ids: string[]) {
  for (const id of ids) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpError(400, 'Invalid group id');
    }
  }
}

async function listUsers() {
  const users = await User.find().sort({ email: 1 }).populate('groupIds');
  return users.map((user) => serializeUser(user as any));
}

function parsePrecondition(value: string) {
  const trimmed = value.trim() || '{}';

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Precondition must be a JSON object');
    }
  } catch {
    throw new HttpError(400, 'Precondition must be a valid JSON object');
  }

  return trimmed;
}

function parseEvents(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Events must be a JSON object');
    }

    return Object.fromEntries(Object.entries(parsed).map(([key, eventValue]) => [key, Boolean(eventValue)]));
  } catch {
    return Object.fromEntries(
      trimmed
        .split(/[\n,]/)
        .map((event) => event.trim())
        .filter(Boolean)
        .map((event) => [event, true])
    );
  }
}

function parseArguments(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      throw new Error('Arguments must be a JSON array');
    }

    return parsed;
  } catch {
    return trimmed
      .split(/\n/)
      .map((argument) => argument.trim())
      .filter(Boolean);
  }
}

router.get('/general', requirePermission('settings:read'), async (_req, res, next) => {
  try {
    const setting = await AppSetting.findOne({ key: 'general' });
    res.json({ settings: setting?.value });
  } catch (error) {
    next(error);
  }
});

router.put('/general', requirePermission('settings:write'), validateBody(generalSettingsSchema), async (req, res, next) => {
  try {
    const setting = await AppSetting.findOneAndUpdate(
      { key: 'general' },
      { value: req.body, updatedBy: (req as any).user._id },
      { upsert: true, new: true }
    );

    await audit(req, 'settings.general.update', 'settings:general', req.body);
    res.json({ settings: setting.value });
  } catch (error) {
    next(error);
  }
});

router.get('/provisions', requirePermission('provisions:read'), async (_req, res, next) => {
  try {
    res.json({ provisions: await acsService.listProvisions() });
  } catch (error) {
    next(error);
  }
});

router.post('/provisions', requirePermission('provisions:write'), validateBody(provisionSchema), async (req, res, next) => {
  try {
    const provisions = await acsService.upsertProvision(req.body);
    await audit(req, 'provisions.create', `provision:${req.body.name}`);
    res.status(201).json({ provisions });
  } catch (error) {
    next(error);
  }
});

router.put('/provisions/:name', requirePermission('provisions:write'), validateBody(provisionSchema), async (req, res, next) => {
  try {
    const previousName = routeParam(req.params.name, 'name');
    const provisions = await acsService.upsertProvision(req.body, previousName);
    await audit(req, 'provisions.update', `provision:${req.body.name}`, { previousName });
    res.json({ provisions });
  } catch (error) {
    next(error);
  }
});

router.delete('/provisions/:name', requirePermission('provisions:write'), async (req, res, next) => {
  try {
    const name = routeParam(req.params.name, 'name');
    const provisions = await acsService.deleteProvision(name);
    await audit(req, 'provisions.delete', `provision:${name}`);
    res.json({ provisions });
  } catch (error) {
    next(error);
  }
});

router.get('/presets', requirePermission('presets:read'), async (_req, res, next) => {
  try {
    res.json({ presets: await acsService.listPresets() });
  } catch (error) {
    next(error);
  }
});

router.post('/presets', requirePermission('presets:write'), validateBody(presetSchema), async (req, res, next) => {
  try {
    const presets = await acsService.upsertPreset({
      name: req.body.name,
      channel: req.body.channel,
      weight: req.body.weight,
      events: parseEvents(req.body.events),
      precondition: parsePrecondition(req.body.precondition),
      provision: req.body.provision,
      arguments: parseArguments(req.body.arguments)
    });

    await audit(req, 'presets.create', `preset:${req.body.name}`);
    res.status(201).json({ presets });
  } catch (error) {
    next(error);
  }
});

router.put('/presets/:name', requirePermission('presets:write'), validateBody(presetSchema), async (req, res, next) => {
  try {
    const previousName = routeParam(req.params.name, 'name');
    const presets = await acsService.upsertPreset(
      {
        name: req.body.name,
        channel: req.body.channel,
        weight: req.body.weight,
        events: parseEvents(req.body.events),
        precondition: parsePrecondition(req.body.precondition),
        provision: req.body.provision,
        arguments: parseArguments(req.body.arguments)
      },
      previousName
    );

    await audit(req, 'presets.update', `preset:${req.body.name}`, { previousName });
    res.json({ presets });
  } catch (error) {
    next(error);
  }
});

router.delete('/presets/:name', requirePermission('presets:write'), async (req, res, next) => {
  try {
    const name = routeParam(req.params.name, 'name');
    const presets = await acsService.deletePreset(name);
    await audit(req, 'presets.delete', `preset:${name}`);
    res.json({ presets });
  } catch (error) {
    next(error);
  }
});

router.get('/users', requirePermission('users:manage'), async (_req, res, next) => {
  try {
    res.json({ users: await listUsers() });
  } catch (error) {
    next(error);
  }
});

router.post('/users', requirePermission('users:manage'), validateBody(userCreateSchema), async (req, res, next) => {
  try {
    ensureObjectIds(req.body.groupIds);
    const passwordHash = await bcrypt.hash(req.body.password, config.BCRYPT_ROUNDS);

    await User.create({
      email: req.body.email.toLowerCase(),
      name: req.body.name,
      passwordHash,
      groupIds: req.body.groupIds,
      status: req.body.status
    });

    await audit(req, 'users.create', `user:${req.body.email}`);
    res.status(201).json({ users: await listUsers() });
  } catch (error) {
    next(error);
  }
});

router.put('/users/:id', requirePermission('users:manage'), validateBody(userUpdateSchema), async (req, res, next) => {
  try {
    const id = routeParam(req.params.id);
    ensureObjectIds(req.body.groupIds);
    await User.findByIdAndUpdate(id, {
      email: req.body.email.toLowerCase(),
      name: req.body.name,
      groupIds: req.body.groupIds,
      status: req.body.status
    });

    await audit(req, 'users.update', `user:${id}`);
    res.json({ users: await listUsers() });
  } catch (error) {
    next(error);
  }
});

router.post('/users/:id/password', requirePermission('users:manage'), validateBody(passwordSchema), async (req, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const passwordHash = await bcrypt.hash(req.body.password, config.BCRYPT_ROUNDS);
    await User.findByIdAndUpdate(id, { passwordHash });
    await audit(req, 'users.password.update', `user:${id}`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', requirePermission('users:manage'), async (req, res, next) => {
  try {
    const id = routeParam(req.params.id);
    await User.findByIdAndUpdate(id, { status: 'disabled' });
    await audit(req, 'users.disable', `user:${id}`);
    res.json({ users: await listUsers() });
  } catch (error) {
    next(error);
  }
});

router.get('/groups', requirePermission('groups:manage'), async (_req, res, next) => {
  try {
    const groups = await Group.find().sort({ name: 1 });
    res.json({ groups, permissions: [...PERMISSIONS, 'admin:*'] });
  } catch (error) {
    next(error);
  }
});

router.post('/groups', requirePermission('groups:manage'), validateBody(groupSchema), async (req, res, next) => {
  try {
    await Group.create(req.body);
    await audit(req, 'groups.create', `group:${req.body.name}`);
    const groups = await Group.find().sort({ name: 1 });
    res.status(201).json({ groups, permissions: [...PERMISSIONS, 'admin:*'] });
  } catch (error) {
    next(error);
  }
});

router.put('/groups/:id', requirePermission('groups:manage'), validateBody(groupSchema), async (req, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const group = await Group.findById(id);
    if (!group) throw new HttpError(404, 'Group not found');

    group.name = req.body.name;
    group.description = req.body.description;
    group.permissions = req.body.permissions;
    await group.save();

    await audit(req, 'groups.update', `group:${id}`);
    const groups = await Group.find().sort({ name: 1 });
    res.json({ groups, permissions: [...PERMISSIONS, 'admin:*'] });
  } catch (error) {
    next(error);
  }
});

router.delete('/groups/:id', requirePermission('groups:manage'), async (req, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const group = await Group.findById(id);
    if (!group) throw new HttpError(404, 'Group not found');
    if (group.system) throw new HttpError(400, 'System groups cannot be deleted');

    await group.deleteOne();
    await User.updateMany({ groupIds: group._id }, { $pull: { groupIds: group._id } });
    await audit(req, 'groups.delete', `group:${id}`);
    const groups = await Group.find().sort({ name: 1 });
    res.json({ groups, permissions: [...PERMISSIONS, 'admin:*'] });
  } catch (error) {
    next(error);
  }
});

router.get('/audit', requirePermission('audit:read'), async (_req, res, next) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

export default router;
