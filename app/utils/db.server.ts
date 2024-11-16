import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db: any = null;

export async function getDb() {
  if (db) return db;
  
  db = await open({
    filename: process.env.DATABASE_URL || '/var/lib/remix-blog/db/blog.db',
    driver: sqlite3.Database
  });

  // 确保表存在
  await db.exec(`
    CREATE TABLE IF NOT EXISTS t_post (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      class_id INTEGER,
      created_at INTEGER NOT NULL,
      views INTEGER DEFAULT 0,
      FOREIGN KEY (class_id) REFERENCES t_class(id)
    );

    CREATE TABLE IF NOT EXISTS t_class (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS t_user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  return db;
}

// 文章相关操作
export async function getPosts() {
  const db = await getDb();
  return db.all(`
    SELECT p.*, c.name as class_name 
    FROM t_post p 
    LEFT JOIN t_class c ON p.class_id = c.id 
    ORDER BY p.created_at DESC
  `);
}

export async function getPost(id: number) {
  const db = await getDb();
  return db.get('SELECT * FROM t_post WHERE id = ?', id);
}

export async function createPost(data: any) {
  const db = await getDb();
  const result = await db.run(
    'INSERT INTO t_post (title, content, class_id, created_at, views) VALUES (?, ?, ?, ?, 0)',
    [data.title, data.content, data.class_id, Math.floor(Date.now() / 1000)]
  );
  return result.lastID;
}

export async function updatePost(id: number, data: any) {
  const db = await getDb();
  await db.run(
    'UPDATE t_post SET title = ?, content = ?, class_id = ? WHERE id = ?',
    [data.title, data.content, data.class_id, id]
  );
}

export async function deletePost(id: number) {
  const db = await getDb();
  await db.run('DELETE FROM t_post WHERE id = ?', id);
}

// 分类相关操作
export async function getCategories() {
  const db = await getDb();
  return db.all('SELECT * FROM t_class ORDER BY name');
}

export async function createCategory(name: string) {
  const db = await getDb();
  const result = await db.run('INSERT INTO t_class (name) VALUES (?)', name);
  return result.lastID;
}

// 用户相关操作
export async function getUser(username: string) {
  const db = await getDb();
  return db.get('SELECT * FROM t_user WHERE username = ?', username);
}

export async function createUser(username: string, hashedPassword: string) {
  const db = await getDb();
  const result = await db.run(
    'INSERT INTO t_user (username, password, created_at) VALUES (?, ?, ?)',
    [username, hashedPassword, Math.floor(Date.now() / 1000)]
  );
  return result.lastID;
}
