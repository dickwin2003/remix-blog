import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceDir = resolve(__dirname, '../node_modules/tinymce');
const targetDir = resolve(__dirname, '../public/tinymce');

// 确保目标目录存在
await fs.mkdir(targetDir, { recursive: true });

// 复制 TinyMCE 文件
async function copyDir(src, dest) {
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = resolve(src, entry.name);
    const destPath = resolve(dest, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      await copyDir(srcPath, destPath);
    } else {
      // 只复制必要的文件
      if (!entry.name.endsWith('.txt') && 
          !entry.name.endsWith('.json') && 
          !entry.name.endsWith('.md')) {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}

try {
  await copyDir(sourceDir, targetDir);
  console.log('TinyMCE files copied successfully!');
} catch (error) {
  console.error('Error copying TinyMCE files:', error);
  process.exit(1);
}
