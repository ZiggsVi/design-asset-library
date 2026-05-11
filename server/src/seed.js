import prisma from './utils/prisma.js';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Seeding database...');

  // Create users
  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin', email: 'admin@design.com',
      passwordHash: adminHash, displayName: '管理员', role: 'admin'
    }
  });
  console.log('Admin: admin / admin123');

  const editorHash = await bcrypt.hash('editor123', 10);
  await prisma.user.upsert({
    where: { username: 'editor' },
    update: {},
    create: {
      username: 'editor', email: 'editor@design.com',
      passwordHash: editorHash, displayName: '设计师', role: 'editor'
    }
  });
  console.log('Editor: editor / editor123');

  const viewerHash = await bcrypt.hash('viewer123', 10);
  await prisma.user.upsert({
    where: { username: 'viewer' },
    update: {},
    create: {
      username: 'viewer', email: 'viewer@design.com',
      passwordHash: viewerHash, displayName: '访客', role: 'viewer'
    }
  });
  console.log('Viewer: viewer / viewer123');

  // Create categories
  const existing = await prisma.category.findFirst();
  if (!existing) {
    // Parent categories
    const pkgBox = await prisma.category.create({ data: { name: '包装盒型', sortOrder: 1 } });
    const pkgBag = await prisma.category.create({ data: { name: '包装袋', sortOrder: 2 } });
    const label = await prisma.category.create({ data: { name: '瓶罐标贴', sortOrder: 3 } });
    const gift = await prisma.category.create({ data: { name: '礼盒', sortOrder: 4 } });
    const cosmetics = await prisma.category.create({ data: { name: '化妆品包装', sortOrder: 5 } });
    const vi = await prisma.category.create({ data: { name: '品牌VI', sortOrder: 6 } });
    const ref = await prisma.category.create({ data: { name: '参考图', sortOrder: 7 } });
    const final = await prisma.category.create({ data: { name: '定稿文件', sortOrder: 8 } });

    // Sub categories
    await prisma.category.create({ data: { name: '食品包装', parentId: pkgBox.id, sortOrder: 1 } });
    await prisma.category.create({ data: { name: '电子产品包装', parentId: pkgBox.id, sortOrder: 2 } });
    await prisma.category.create({ data: { name: '药品包装', parentId: pkgBox.id, sortOrder: 3 } });
    console.log('Default categories created');
  }

  console.log('Seed completed!');
  await prisma.$disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
