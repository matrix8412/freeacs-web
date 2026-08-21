import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { UserTablePreference } from '../models/UserTablePreference.js';
import { audit } from '../utils/audit.js';
import { routeParam } from '../utils/params.js';

const router = Router();

const tableKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9_.:-]+$/i);

const tablePreferenceSchema = z.object({
  visibleColumns: z.array(z.string().trim().min(1).max(80).regex(/^[a-z0-9_.:-]+$/i)).max(50)
});

router.get('/tables/:tableKey', async (req, res, next) => {
  try {
    const tableKey = tableKeySchema.parse(routeParam(req.params.tableKey, 'tableKey'));
    const preference = await UserTablePreference.findOne({
      userId: req.user!._id,
      tableKey
    });

    res.json({
      preference: {
        tableKey,
        visibleColumns: preference?.visibleColumns || []
      }
    });
  } catch (error) {
    next(error);
  }
});

router.put('/tables/:tableKey', validateBody(tablePreferenceSchema), async (req, res, next) => {
  try {
    const tableKey = tableKeySchema.parse(routeParam(req.params.tableKey, 'tableKey'));
    const preference = await UserTablePreference.findOneAndUpdate(
      {
        userId: req.user!._id,
        tableKey
      },
      {
        visibleColumns: req.body.visibleColumns
      },
      { upsert: true, new: true }
    );

    await audit(req, 'preferences.table.update', `table:${tableKey}`, {
      visibleColumns: req.body.visibleColumns
    });

    res.json({
      preference: {
        tableKey,
        visibleColumns: preference.visibleColumns
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
