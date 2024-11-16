-- Drop existing tables if they exist
DROP TABLE IF EXISTS t_label;
DROP TABLE IF EXISTS t_event;
DROP TABLE IF EXISTS t_post;
DROP TABLE IF EXISTS t_class;
DROP TABLE IF EXISTS t_user;

-- Create blog category table
CREATE TABLE t_class (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create blog post table
CREATE TABLE t_post (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    class_id INTEGER NOT NULL,
    views INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (class_id) REFERENCES t_class(id)
);

-- Create user management table
CREATE TABLE t_user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    last_login INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create event management table
CREATE TABLE t_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    ip_address TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('visit', 'login', 'label')),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create label table
CREATE TABLE t_label (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT,
    ip_address TEXT NOT NULL,
    label_name TEXT NOT NULL,
    post_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (post_id) REFERENCES t_post(id)
);

-- Create indexes
CREATE INDEX idx_post_class ON t_post(class_id);
CREATE INDEX idx_label_post ON t_label(post_id);
CREATE INDEX idx_event_type ON t_event(event_type);

-- Insert sample data
INSERT INTO t_class (name, value) VALUES 
    ('技术分享', 'tech'),
    ('生活随笔', 'life'),
    ('项目经验', 'project');

-- Insert admin user (password: admin123)
INSERT INTO t_user (username, password) VALUES 
    ('admin', '$2b$10$8XKE97ZH.UF3p8g8rYdOz.xXrv/HKC.wPzN0KpCE0EY1.wmI1vMK2');

-- Insert sample blog posts
INSERT INTO t_post (title, content, class_id, views) VALUES 
    ('Remix 和 Cloudflare D1 入门指南', 
     '在这篇文章中，我们将探讨如何使用 Remix 和 Cloudflare D1 构建现代 Web 应用。Remix 是一个全栈 Web 框架，而 Cloudflare D1 是一个边缘 SQL 数据库...', 
     1, 
     128),
    ('如何保持工作生活平衡', 
     '在当今快节奏的生活中，保持工作和生活的平衡变得越来越重要。本文将分享一些实用的技巧和经验...', 
     2, 
     85),
    ('React 项目最佳实践分享', 
     '基于多年的 React 开发经验，我总结了一些在大型项目中特别有用的最佳实践。这些实践包括代码组织、状态管理、性能优化等方面...', 
     3, 
     256);

-- Insert sample labels
INSERT INTO t_label (nickname, ip_address, label_name, post_id) VALUES
    ('技术爱好者', '127.0.0.1', 'Remix', 1),
    ('前端开发', '127.0.0.1', 'Web开发', 1),
    ('生活达人', '127.0.0.1', '工作效率', 2),
    ('React专家', '127.0.0.1', 'React', 3),
    ('架构师', '127.0.0.1', '最佳实践', 3);
