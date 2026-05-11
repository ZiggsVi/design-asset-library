import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || '../uploads');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, 'originals')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB

const versionStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, 'versions')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const versionUpload = multer({ storage: versionStorage, limits: { fileSize: 500 * 1024 * 1024 } });

// Image types that support sharp processing
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/tiff'];

// List assets with search/filter/pagination
router.get('/', async (req, res, next) => {
  try {
    const { search, categoryId, status, fileType, uploaderId, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { tags: { contains: search } }
      ];
    }
    if (categoryId) where.categoryId = parseInt(categoryId);
    if (status) where.status = status;
    if (fileType) where.fileType = fileType;
    if (uploaderId) where.uploaderId = parseInt(uploaderId);

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: { uploader: { select: { id: true, displayName: true } }, category: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize)
      }),
      prisma.asset.count({ where })
    ]);
    res.json({ assets, total, page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (e) { next(e); }
});

// Upload asset
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请选择文件' });
    const file = req.file;
    const { title, description, categoryId, tags, status } = req.body;

    let thumbnailPath = null;
    let width = null, height = null;

    // Generate thumbnail for images
    if (IMAGE_TYPES.includes(file.mimetype)) {
      const thumbFilename = `thumb_${file.filename}`;
      const thumbPath = path.join(UPLOAD_DIR, 'thumbnails', thumbFilename);
      try {
        const metadata = await sharp(file.path).metadata();
        width = metadata.width;
        height = metadata.height;
        await sharp(file.path)
          .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
          .toFile(thumbPath);
        thumbnailPath = `/uploads/thumbnails/${thumbFilename}`;
      } catch (e) {
        console.warn('Thumbnail generation failed:', e.message);
      }
    }

    const parsedTags = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [];

    const asset = await prisma.asset.create({
      data: {
        title: title || file.originalname,
        description: description || '',
        categoryId: categoryId ? parseInt(categoryId) : null,
        filePath: `/uploads/originals/${file.filename}`,
        fileSize: file.size,
        fileType: path.extname(file.originalname).toLowerCase().replace('.', ''),
        mimeType: file.mimetype,
        thumbnailPath,
        width,
        height,
        tags: JSON.stringify(parsedTags),
        uploaderId: req.user.id,
        status: status || 'reference'
      },
      include: { uploader: { select: { id: true, displayName: true } } }
    });

    res.json(asset);
  } catch (e) { next(e); }
});

// Get asset detail
router.get('/:id', async (req, res, next) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        uploader: { select: { id: true, displayName: true } },
        category: { select: { id: true, name: true } }
      }
    });
    if (!asset) return res.status(404).json({ error: '素材不存在' });
    res.json(asset);
  } catch (e) { next(e); }
});

// Update asset metadata
router.put('/:id', async (req, res, next) => {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!asset) return res.status(404).json({ error: '素材不存在' });
    // Only admin or uploader can edit
    if (req.user.role !== 'admin' && asset.uploaderId !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    const { title, description, categoryId, tags, status } = req.body;
    const updated = await prisma.asset.update({
      where: { id: parseInt(req.params.id) },
      data: {
        title, description,
        categoryId: categoryId !== undefined ? (categoryId ? parseInt(categoryId) : null) : undefined,
        tags: tags ? JSON.stringify(tags) : undefined,
        status
      },
      include: { uploader: { select: { id: true, displayName: true } } }
    });
    res.json(updated);
  } catch (e) { next(e); }
});

// Delete asset
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const asset = await prisma.asset.findUnique({ where: { id }, include: { versions: true } });
    if (!asset) return res.status(404).json({ error: '素材不存在' });
    if (req.user.role !== 'admin' && asset.uploaderId !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    // Delete files
    try {
      const originalPath = path.resolve(UPLOAD_DIR, '..', asset.filePath.replace(/^\//, ''));
      await fs.unlink(originalPath).catch(() => {});
      if (asset.thumbnailPath) {
        const thumbPath = path.resolve(UPLOAD_DIR, '..', asset.thumbnailPath.replace(/^\//, ''));
        await fs.unlink(thumbPath).catch(() => {});
      }
      for (const v of asset.versions) {
        const vPath = path.resolve(UPLOAD_DIR, '..', v.filePath.replace(/^\//, ''));
        await fs.unlink(vPath).catch(() => {});
      }
    } catch (e) { console.warn('File cleanup warning:', e.message); }
    await prisma.asset.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// Download asset file
router.get('/:id/download', async (req, res, next) => {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!asset) return res.status(404).json({ error: '素材不存在' });
    const filePath = path.resolve(UPLOAD_DIR, '..', asset.filePath.replace(/^\//, ''));
    res.download(filePath);
  } catch (e) { next(e); }
});

// === Color Extraction Helper ===

async function extractColors(imagePath) {
  try {
    const { data, info } = await sharp(imagePath)
      .resize(80, 80, { fit: 'inside' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const colorMap = {};
    const step = 48;
    for (let i = 0; i < data.length; i += info.channels) {
      const r = Math.round(data[i] / step) * step;
      const g = Math.round(data[i + 1] / step) * step;
      const b = Math.round(data[i + 2] / step) * step;
      const hex = '#' + [r, g, b].map(v => Math.min(v, 255).toString(16).padStart(2, '0')).join('');
      colorMap[hex] = (colorMap[hex] || 0) + 1;
    }
    return Object.entries(colorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => color);
  } catch (e) {
    return [];
  }
}

// Batch upload (up to 15 images)
const batchUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, 'originals')),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 100 * 1024 * 1024, files: 15 }
});

router.post('/batch', batchUpload.array('files', 15), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: '请选择文件' });
    const { categoryId, tags, status } = req.body;
    const parsedTags = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [];
    const batchId = uuidv4();
    const results = [];

    for (const file of req.files) {
      let thumbnailPath = null;
      let width = null, height = null;
      let colors = [];

      if (IMAGE_TYPES.includes(file.mimetype)) {
        const thumbFilename = `thumb_${file.filename}`;
        const thumbFullPath = path.join(UPLOAD_DIR, 'thumbnails', thumbFilename);
        try {
          const metadata = await sharp(file.path).metadata();
          width = metadata.width;
          height = metadata.height;
          await sharp(file.path)
            .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
            .toFile(thumbFullPath);
          thumbnailPath = `/uploads/thumbnails/${thumbFilename}`;
          colors = await extractColors(file.path);
        } catch (e) {
          console.warn('Image processing failed for', file.filename, e.message);
        }
      }

      const asset = await prisma.asset.create({
        data: {
          title: file.originalname.replace(path.extname(file.originalname), ''),
          description: req.body.description || '',
          categoryId: categoryId ? parseInt(categoryId) : null,
          filePath: `/uploads/originals/${file.filename}`,
          fileSize: file.size,
          fileType: path.extname(file.originalname).toLowerCase().replace('.', ''),
          mimeType: file.mimetype,
          thumbnailPath, width, height,
          tags: JSON.stringify(parsedTags),
          colors: JSON.stringify(colors),
          batchId,
          uploaderId: req.user.id,
          status: status || 'reference'
        },
        include: { uploader: { select: { id: true, displayName: true } } }
      });
      results.push(asset);
    }

    res.json({ assets: results, batchId, count: results.length });
  } catch (e) { next(e); }
});

// Get assets by batch
router.get('/batch/:batchId', async (req, res, next) => {
  try {
    const assets = await prisma.asset.findMany({
      where: { batchId: req.params.batchId },
      orderBy: { createdAt: 'asc' },
      include: {
        uploader: { select: { id: true, displayName: true } },
        category: { select: { id: true, name: true } }
      }
    });
    if (assets.length === 0) return res.status(404).json({ error: '批次不存在' });
    res.json({ assets, batchId: req.params.batchId, count: assets.length });
  } catch (e) { next(e); }
});

// === Version Management ===

// Upload new version
router.post('/:id/versions', versionUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请选择文件' });
    const assetId = parseInt(req.params.id);
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) return res.status(404).json({ error: '素材不存在' });

    if (req.user.role !== 'admin' && asset.uploaderId !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }

    const file = req.file;
    const maxVersion = await prisma.assetVersion.findFirst({
      where: { assetId },
      orderBy: { versionNumber: 'desc' }
    });
    const versionNumber = (maxVersion?.versionNumber || 0) + 1;

    const version = await prisma.assetVersion.create({
      data: {
        assetId,
        versionNumber,
        filePath: `/uploads/versions/${file.filename}`,
        fileSize: file.size,
        fileType: path.extname(file.originalname).toLowerCase().replace('.', ''),
        uploaderId: req.user.id,
        comment: req.body.comment || ''
      },
      include: { uploader: { select: { id: true, displayName: true } } }
    });

    // Mark asset as having latest version
    await prisma.asset.update({ where: { id: assetId }, data: { isLatestVersion: true } });

    res.json(version);
  } catch (e) { next(e); }
});

// List versions
router.get('/:id/versions', async (req, res, next) => {
  try {
    const versions = await prisma.assetVersion.findMany({
      where: { assetId: parseInt(req.params.id) },
      orderBy: { versionNumber: 'desc' },
      include: { uploader: { select: { id: true, displayName: true } } }
    });
    res.json(versions);
  } catch (e) { next(e); }
});

// Download version file
router.get('/:id/versions/:vid/download', async (req, res, next) => {
  try {
    const version = await prisma.assetVersion.findFirst({
      where: { id: parseInt(req.params.vid), assetId: parseInt(req.params.id) }
    });
    if (!version) return res.status(404).json({ error: '版本不存在' });
    const filePath = path.resolve(UPLOAD_DIR, '..', version.filePath.replace(/^\//, ''));
    res.download(filePath);
  } catch (e) { next(e); }
});

export default router;
