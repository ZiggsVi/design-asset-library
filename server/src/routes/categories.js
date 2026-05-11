import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Get category tree, optionally filtered by type
router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    const where = {};
    if (type) where.type = type;
    const categories = await prisma.category.findMany({ where, orderBy: { sortOrder: 'asc' } });
    // Build tree
    const map = {};
    const roots = [];
    categories.forEach(c => { map[c.id] = { ...c, children: [] }; });
    categories.forEach(c => {
      if (c.parentId) {
        map[c.parentId]?.children.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });
    res.json(roots);
  } catch (e) { next(e); }
});

// Create category
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { name, parentId, type, sortOrder } = req.body;
    const category = await prisma.category.create({
      data: { name, parentId: parentId || null, type: type || 'material', sortOrder: sortOrder || 0 }
    });
    res.json(category);
  } catch (e) { next(e); }
});

// Update category
router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { name, parentId, type, sortOrder } = req.body;
    const category = await prisma.category.update({
      where: { id: parseInt(req.params.id) },
      data: { name, parentId: parentId || null, type, sortOrder }
    });
    res.json(category);
  } catch (e) { next(e); }
});

// Delete category
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    // Move assets to uncategorized
    await prisma.asset.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
    // Move children to parent
    const cat = await prisma.category.findUnique({ where: { id } });
    await prisma.category.updateMany({ where: { parentId: id }, data: { parentId: cat.parentId } });
    await prisma.category.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
