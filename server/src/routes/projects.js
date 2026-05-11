import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || '../uploads');

const reqFileUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, 'requirements')),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 100 * 1024 * 1024 }
});

const delUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, 'deliverables')),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 500 * 1024 * 1024 }
});

// === Projects ===

router.get('/', async (req, res, next) => {
  try {
    const { search, status, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (search) where.name = { contains: search };
    if (status) where.status = status;
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
        include: {
          creator: { select: { id: true, displayName: true } },
          _count: { select: { deliverables: true, materialLinks: true } }
        }
      }),
      prisma.project.count({ where })
    ]);
    res.json({ projects, total, page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, description, client } = req.body;
    const project = await prisma.project.create({
      data: { name, description: description || '', client: client || '', createdBy: req.user.id }
    });
    res.json(project);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        creator: { select: { id: true, displayName: true } },
        reqFiles: true,
        materialLinks: { include: { asset: { select: { id: true, title: true, filePath: true, thumbnailPath: true, fileType: true } } } },
        deliverables: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploader: { select: { id: true, displayName: true } },
            files: true
          }
        }
      }
    });
    if (!project) return res.status(404).json({ error: '项目不存在' });
    res.json(project);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, client, status } = req.body;
    const project = await prisma.project.update({
      where: { id: parseInt(req.params.id) },
      data: { name, description, client, status }
    });
    res.json(project);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// === Project Material Links ===

router.post('/:id/materials', async (req, res, next) => {
  try {
    const { assetId, note } = req.body;
    const link = await prisma.projectMaterialLink.create({
      data: { projectId: parseInt(req.params.id), assetId: parseInt(assetId), note: note || '' }
    });
    res.json(link);
  } catch (e) { next(e); }
});

router.delete('/:id/materials/:linkId', async (req, res, next) => {
  try {
    await prisma.projectMaterialLink.delete({ where: { id: parseInt(req.params.linkId) } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// === Requirement Files ===

router.post('/:id/req-files', reqFileUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请选择文件' });
    const file = await prisma.projectRequirementFile.create({
      data: {
        projectId: parseInt(req.params.id),
        filePath: `/uploads/requirements/${req.file.filename}`,
        fileType: path.extname(req.file.originalname).toLowerCase().replace('.', '')
      }
    });
    res.json(file);
  } catch (e) { next(e); }
});

router.delete('/:id/req-files/:fid', async (req, res, next) => {
  try {
    await prisma.projectRequirementFile.delete({ where: { id: parseInt(req.params.fid) } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// === Deliverables ===

router.get('/:id/deliverables', async (req, res, next) => {
  try {
    const deliverables = await prisma.deliverable.findMany({
      where: { projectId: parseInt(req.params.id) },
      orderBy: { createdAt: 'desc' },
      include: { uploader: { select: { id: true, displayName: true } }, files: true }
    });
    res.json(deliverables);
  } catch (e) { next(e); }
});

router.post('/:id/deliverables', delUpload.array('files', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: '请至少选择一个文件' });
    const { name, description } = req.body;
    const deliverable = await prisma.deliverable.create({
      data: {
        projectId: parseInt(req.params.id),
        name: name || `交付物-${Date.now()}`,
        description: description || '',
        uploaderId: req.user.id,
        files: {
          create: req.files.map(f => ({
            filePath: `/uploads/deliverables/${f.filename}`,
            fileSize: f.size,
            fileType: path.extname(f.originalname).toLowerCase().replace('.', ''),
            originalName: f.originalname
          }))
        }
      },
      include: { files: true, uploader: { select: { id: true, displayName: true } } }
    });
    res.json(deliverable);
  } catch (e) { next(e); }
});

router.put('/deliverables/:id', async (req, res, next) => {
  try {
    const { name, description, status } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    const deliverable = await prisma.deliverable.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: { files: true, uploader: { select: { id: true, displayName: true } } }
    });
    res.json(deliverable);
  } catch (e) { next(e); }
});

router.delete('/deliverables/:id', async (req, res, next) => {
  try {
    await prisma.deliverable.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// New version: upload a new set of files for the same deliverable
router.post('/deliverables/:id/next-version', delUpload.array('files', 10), async (req, res, next) => {
  try {
    const deliverableId = parseInt(req.params.id);
    const existing = await prisma.deliverable.findUnique({ where: { id: deliverableId } });
    if (!existing) return res.status(404).json({ error: '交付物不存在' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: '请选择文件' });
    const deliverable = await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        version: existing.version + 1,
        files: {
          create: req.files.map(f => ({
            filePath: `/uploads/deliverables/${f.filename}`,
            fileSize: f.size,
            fileType: path.extname(f.originalname).toLowerCase().replace('.', ''),
            originalName: f.originalname
          }))
        }
      },
      include: { files: true, uploader: { select: { id: true, displayName: true } } }
    });
    res.json(deliverable);
  } catch (e) { next(e); }
});

// Download deliverable file
router.get('/deliverables/:id/files/:fid/download', async (req, res, next) => {
  try {
    const file = await prisma.deliverableFile.findFirst({
      where: { id: parseInt(req.params.fid), deliverableId: parseInt(req.params.id) }
    });
    if (!file) return res.status(404).json({ error: '文件不存在' });
    const filePath = path.resolve(UPLOAD_DIR, '..', file.filePath.replace(/^\//, ''));
    res.download(filePath, file.originalName);
  } catch (e) { next(e); }
});

export default router;
