import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || '../uploads');

const fileUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, 'learning')),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 200 * 1024 * 1024 }
});

// List with search/filter
router.get('/', async (req, res, next) => {
  try {
    const { search, type, category, page = 1, pageSize = 30 } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { tags: { contains: search } }
      ];
    }
    if (type) where.type = type;
    if (category) where.category = category;

    const [resources, total] = await Promise.all([
      prisma.learningResource.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
        include: { uploader: { select: { id: true, displayName: true } } }
      }),
      prisma.learningResource.count({ where })
    ]);
    res.json({ resources, total, page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (e) { next(e); }
});

// Upload file resource
router.post('/', fileUpload.single('file'), async (req, res, next) => {
  try {
    const { title, description, type, category, tags } = req.body;
    // Link-type resources don't have a file
    const isLink = type === 'link' || type === 'cloud_link';
    const parsedTags = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [];
    const resource = await prisma.learningResource.create({
      data: {
        title: title || (req.file ? req.file.originalname : '未命名'),
        description: description || '',
        type: type || 'image',
        content: isLink ? (req.body.content || '') : (req.file ? `/uploads/learning/${req.file.filename}` : ''),
        fileSize: req.file?.size || null,
        category: category || '',
        tags: JSON.stringify(parsedTags),
        uploaderId: req.user.id
      },
      include: { uploader: { select: { id: true, displayName: true } } }
    });
    res.json(resource);
  } catch (e) { next(e); }
});

// Create link-type resource without file
router.post('/link', async (req, res, next) => {
  try {
    const { title, description, type, content, category, tags } = req.body;
    const parsedTags = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [];
    const resource = await prisma.learningResource.create({
      data: {
        title, description: description || '',
        type: type || 'link',
        content: content || '',
        category: category || '',
        tags: JSON.stringify(parsedTags),
        uploaderId: req.user.id
      },
      include: { uploader: { select: { id: true, displayName: true } } }
    });
    res.json(resource);
  } catch (e) { next(e); }
});

// Update
router.put('/:id', async (req, res, next) => {
  try {
    const { title, description, type, content, category, tags } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (type !== undefined) data.type = type;
    if (content !== undefined) data.content = content;
    if (category !== undefined) data.category = category;
    if (tags !== undefined) data.tags = JSON.stringify(tags);
    const resource = await prisma.learningResource.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: { uploader: { select: { id: true, displayName: true } } }
    });
    res.json(resource);
  } catch (e) { next(e); }
});

// Delete
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.learningResource.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// Download
router.get('/:id/download', async (req, res, next) => {
  try {
    const resource = await prisma.learningResource.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!resource) return res.status(404).json({ error: '资料不存在' });
    const filePath = path.resolve(UPLOAD_DIR, '..', resource.content.replace(/^\//, ''));
    res.download(filePath);
  } catch (e) { next(e); }
});

// Get categories
router.get('/categories/list', async (req, res, next) => {
  try {
    const result = await prisma.learningResource.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { category: { not: '' } }
    });
    res.json(result.map(r => r.category));
  } catch (e) { next(e); }
});

export default router;
