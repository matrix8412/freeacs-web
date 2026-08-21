import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { clearAuthCookies, setAuthCookies } from '../utils/security.js';
import { serializeUser } from '../utils/serialize.js';
import { audit } from '../utils/audit.js';
import { HttpError } from '../utils/http.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60_000,
  limit: config.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256)
});

router.post('/login', loginLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase(), status: 'active' }).populate('groupIds');

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      await audit(req, 'auth.login_failed', 'auth', { email });
      throw new HttpError(401, 'Invalid email or password');
    }

    user.lastLoginAt = new Date();
    await user.save();
    const csrfToken = setAuthCookies(res, String(user._id));
    req.user = user;
    await audit(req, 'auth.login', 'auth');

    res.json({ user: serializeUser(user), csrfToken });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authenticate, async (req, res) => {
  await audit(req, 'auth.logout', 'auth');
  clearAuthCookies(res);
  res.status(204).send();
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: serializeUser(req.user!) });
});

export default router;
