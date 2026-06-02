import bcrypt from 'bcryptjs';
import { DEFAULT_GROUPS } from '../config/permissions.js';
import { config } from '../config/env.js';
import { Group } from '../models/Group.js';
import { User } from '../models/User.js';
import { AppSetting } from '../models/AppSetting.js';
import { logger } from '../utils/logger.js';

export async function bootstrapApplication() {
  for (const group of DEFAULT_GROUPS) {
    await Group.updateOne(
      { name: group.name },
      {
        $setOnInsert: {
          description: group.description,
          permissions: [...group.permissions],
          system: group.system
        }
      },
      { upsert: true }
    );
  }

  const adminGroup = await Group.findOne({ name: 'Administrators' });
  const admin = await User.findOne({ email: config.INITIAL_ADMIN_EMAIL.toLowerCase() });

  if (!admin && adminGroup) {
    const passwordHash = await bcrypt.hash(config.INITIAL_ADMIN_PASSWORD, config.BCRYPT_ROUNDS);
    await User.create({
      email: config.INITIAL_ADMIN_EMAIL.toLowerCase(),
      name: 'Initial Administrator',
      passwordHash,
      groupIds: [adminGroup._id],
      status: 'active'
    });

    logger.info({ email: config.INITIAL_ADMIN_EMAIL }, 'Created initial administrator');
  }

  await AppSetting.updateOne(
    { key: 'general' },
    {
      $setOnInsert: {
        value: {
          acsPublicUrl: config.ACS_CWMP_PUBLIC_URL,
          informIntervalSeconds: 3600,
          requireCpeAuthentication: true,
          registrationMode: 'manual-approval',
          sessionTimeoutSeconds: config.SESSION_TTL_SECONDS
        }
      }
    },
    { upsert: true }
  );
}

