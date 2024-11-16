import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

async function deploy() {
  try {
    // 清理旧的构建文件
    console.log('清理旧的构建文件...');
    await fs.remove(distDir);
    await fs.ensureDir(distDir);

    // 安装依赖
    console.log('安装依赖...');
    await execCommand('npm install');

    // 构建项目
    console.log('构建项目...');
    await execCommand('npm run build');

    // 创建部署目录结构
    console.log('创建部署目录结构...');
    const deployFiles = [
      'package.json',
      'server.mjs',
      'build',
      'public',
      'DEPLOY.md'
    ];

    for (const file of deployFiles) {
      const src = path.join(rootDir, file);
      const dest = path.join(distDir, file);
      if (await fs.pathExists(src)) {
        await fs.copy(src, dest);
      }
    }

    // 创建精简版的 package.json
    const pkg = await fs.readJson(path.join(rootDir, 'package.json'));
    const deployPkg = {
      name: pkg.name,
      version: pkg.version,
      type: pkg.type,
      scripts: {
        start: pkg.scripts.start
      },
      dependencies: pkg.dependencies
    };
    await fs.writeJson(path.join(distDir, 'package.json'), deployPkg, { spaces: 2 });

    // 创建 .env 示例文件
    const envExample = `# 数据库配置
DATABASE_URL=/var/lib/remix-blog/db/blog.db

# 服务器配置
PORT=3000
NODE_ENV=production
`;
    await fs.writeFile(path.join(distDir, '.env.example'), envExample);

    console.log('部署文件已准备完成，位于 dist 目录中');
    console.log('请按照 DEPLOY.md 中的说明进行部署');

  } catch (error) {
    console.error('部署准备失败:', error);
    process.exit(1);
  }
}

function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: rootDir }, (error, stdout, stderr) => {
      if (error) {
        console.error(`执行命令失败: ${command}`);
        console.error(stderr);
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

deploy();
