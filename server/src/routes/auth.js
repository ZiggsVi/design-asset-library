import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import { signToken } from '../utils/jwt.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role, email: user.email }
    });
  } catch (e) { next(e); }
});

// Register (admin only)
router.post('/register', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { username, password, displayName, email, role } = req.body;
    const exists = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] }
    });
    if (exists) return res.status(400).json({ error: '用户名或邮箱已存在' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, passwordHash, displayName, email, role: role || 'editor' }
    });
    res.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role });
  } catch (e) { next(e); }
});

// Get current user
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, displayName: true, email: true, role: true, createdAt: true }
    });
    res.json(user);
  } catch (e) { next(e); }
});

// List users (admin only)
router.get('/users', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, displayName: true, email: true, role: true, createdAt: true }
    });
    res.json(users);
  } catch (e) { next(e); }
});

// Update user role (admin only)
router.put('/users/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { role, displayName, email } = req.body;
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { role, displayName, email },
      select: { id: true, username: true, displayName: true, email: true, role: true }
    });
    res.json(user);
  } catch (e) { next(e); }
});

router.delete('/users/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: '不能删除自己' });
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
