export const PERMISSIONS = [
  'dashboard:read',
  'devices:read',
  'devices:write',
  'presets:read',
  'presets:write',
  'provisions:read',
  'provisions:write',
  'settings:read',
  'settings:write',
  'users:manage',
  'groups:manage',
  'audit:read'
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ADMIN_PERMISSION = 'admin:*';

export const DEFAULT_GROUPS = [
  {
    name: 'Administrators',
    description: 'Full application and ACS access.',
    permissions: [ADMIN_PERMISSION],
    system: true
  },
  {
    name: 'Operators',
    description: 'Read devices and run operational ACS tasks.',
    permissions: ['dashboard:read', 'devices:read', 'devices:write', 'presets:read', 'provisions:read', 'settings:read'],
    system: true
  },
  {
    name: 'Auditors',
    description: 'Read-only fleet and audit access.',
    permissions: ['dashboard:read', 'devices:read', 'presets:read', 'provisions:read', 'settings:read', 'audit:read'],
    system: true
  }
] as const;
