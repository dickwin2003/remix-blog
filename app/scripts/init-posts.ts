import { faker } from "@faker-js/faker";

interface Class {
  id: number;
  name: string;
  value: string;
}

export async function initializePosts(db: D1Database) {
  // 获取所有分类
  const classes = await db
    .prepare("SELECT id, name, value FROM t_class")
    .all<Class>();

  if (!classes.results?.length) {
    throw new Error("No classes found");
  }

  // 为每个分类生成100条文章
  for (const cls of classes.results) {
    for (let i = 0; i < 100; i++) {
      const title = faker.lorem.sentence({ min: 4, max: 8 });
      const content = faker.lorem.paragraphs({ min: 3, max: 7 });
      const views = faker.number.int({ min: 0, max: 1000 });
      const created_at = Math.floor(faker.date
        .between({
          from: "2023-01-01T00:00:00.000Z",
          to: "2024-01-01T00:00:00.000Z",
        })
        .getTime() / 1000);

      await db
        .prepare(
          `
          INSERT INTO t_post (title, content, views, created_at, class_id)
          VALUES (?, ?, ?, ?, ?)
        `
        )
        .bind(title, content, views, created_at, cls.id)
        .run();
    }
  }
}
