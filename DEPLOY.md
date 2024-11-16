# Remix Blog 部署指南

本指南将帮助你将 Remix Blog 部署到 CentOS 服务器。

## 前置条件

1. CentOS 7 或更高版本
2. Node.js 18 或更高版本
3. npm 或 yarn
4. PM2 (用于进程管理)
5. Nginx (用于反向代理)

## 部署步骤

### 1. 准备服务器环境

```bash
# 安装 Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx
sudo yum install -y epel-release
sudo yum install -y nginx
```

### 2. 配置 Nginx

创建 Nginx 配置文件：

```bash
sudo nano /etc/nginx/conf.d/remix-blog.conf
```

添加以下配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. 部署应用

1. 在本地构建应用：
```bash
npm install
npm run build
```

2. 将以下文件和目录传输到服务器：
   - `package.json`
   - `server.mjs`
   - `build/` 目录
   - `public/` 目录

3. 在服务器上安装依赖：
```bash
npm install --production
```

4. 使用 PM2 启动应用：
```bash
pm2 start server.mjs --name "remix-blog"
```

### 4. 配置自动启动

```bash
# 生成 PM2 启动脚本
pm2 startup systemd
# 保存当前进程列表
pm2 save
```

### 5. 启动服务

```bash
# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 检查应用状态
pm2 status
```

## 数据库配置

由于原项目使用的是 Cloudflare D1 数据库，你需要将数据库迁移到 SQLite 或其他数据库。建议使用 SQLite 作为替代，因为它最接近 D1 的使用方式。

1. 创建数据库目录：
```bash
mkdir -p /var/lib/remix-blog/db
```

2. 设置权限：
```bash
sudo chown -R nodejs:nodejs /var/lib/remix-blog
```

## 更新应用

当需要更新应用时，执行以下步骤：

1. 构建新版本
2. 上传新文件
3. 安装依赖（如果有新依赖）
4. 重启应用：
```bash
pm2 restart remix-blog
```

## 故障排除

1. 检查应用日志：
```bash
pm2 logs remix-blog
```

2. 检查 Nginx 日志：
```bash
sudo tail -f /var/log/nginx/error.log
```

3. 检查应用状态：
```bash
pm2 status
```

## 安全建议

1. 配置防火墙：
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

2. 启用 HTTPS：
使用 Let's Encrypt 获取 SSL 证书：
```bash
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

3. 定期更新系统：
```bash
sudo yum update -y
```
