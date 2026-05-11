import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRoutes from './src/routes/auth.js';
import categoryRoutes from './src/routes/categories.js';
import assetRoutes from './src/routes/assets.js';
import projectRoutes from './src/routes/projects.js';
import learningRoutes from './src/routes/learning.js';
import { errorHandler } from './src/middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directories exist
const uploadsPath = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || '../uploads');
['', 'originals', 'thumbnails', 'versions', 'requirements', 'deliverables', 'learning'].forEach(dir => {
  const fullPath = path.join(uploadsPath, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

app.use(cors());
app.use(express.json());

// Uploaded files static serving
app.use('/uploads', express.static(uploadsPath));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/learning', learningRoutes);

// Serve frontend in production
const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDist, 'index.html'));
  }
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
