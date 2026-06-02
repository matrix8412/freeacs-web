import { Router } from 'express';
import { acsService } from '../services/acs.js';

const router = Router();

router.get('/summary', async (_req, res, next) => {
  try {
    const [devices, health] = await Promise.all([acsService.listDevices({ limit: 500 }), acsService.health()]);
    const online = devices.filter((device) => device.online).length;
    const offline = devices.length - online;
    const vendors = new Set(devices.map((device) => device.manufacturer).filter(Boolean));
    const recent = devices
      .filter((device) => device.lastInform)
      .sort((a, b) => new Date(b.lastInform).getTime() - new Date(a.lastInform).getTime())
      .slice(0, 8);

    res.json({
      acs: health,
      totals: {
        devices: devices.length,
        online,
        offline,
        vendors: vendors.size
      },
      recent
    });
  } catch (error) {
    next(error);
  }
});

export default router;

