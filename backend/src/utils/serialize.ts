import type { Permission } from '../config/permissions.js';
import { ADMIN_PERMISSION } from '../config/permissions.js';

type PopulatedGroup = {
  _id: unknown;
  name: string;
  permissions: string[];
};

type SerializableUser = {
  _id: unknown;
  email: string;
  name: string;
  status: string;
  groupIds?: unknown[];
  lastLoginAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function isPopulatedGroup(value: unknown): value is PopulatedGroup {
  return Boolean(value && typeof value === 'object' && 'permissions' in value && 'name' in value);
}

export function serializeUser(user: SerializableUser) {
  const groups = (user.groupIds || []).filter(isPopulatedGroup).map((group) => ({
    id: String(group._id),
    name: group.name,
    permissions: group.permissions
  }));

  const permissions = Array.from(new Set(groups.flatMap((group) => group.permissions)));

  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    status: user.status,
    groups,
    permissions,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export function hasPermission(user: SerializableUser | undefined, permission: Permission | typeof ADMIN_PERMISSION) {
  if (!user) return false;
  const groups = (user.groupIds || []).filter(isPopulatedGroup);
  return groups.some((group) => group.permissions.includes(ADMIN_PERMISSION) || group.permissions.includes(permission));
}
