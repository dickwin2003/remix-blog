import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData } from "@remix-run/react";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database };

  try {
    // 获取所有分类
    const classes = await env.DB.prepare(
      "SELECT id FROM t_class"
    ).all<{ id: number }>();

    if (!classes.results?.length) {
      throw new Error("No classes found");
    }

    // 对每个分类，只保留最新的20条文章
    for (const cls of classes.results) {
      // 获取该分类下需要删除的文章ID
      const postsToDelete = await env.DB.prepare(`
        WITH RankedPosts AS (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY class_id ORDER BY created_at DESC) as rn
          FROM t_post
          WHERE class_id = ?
        )
        SELECT id
        FROM RankedPosts
        WHERE rn > 20
      `).bind(cls.id).all<{ id: number }>();

      if (postsToDelete.results?.length) {
        // 删除多余的文章
        const ids = postsToDelete.results.map(p => p.id);
        await env.DB.prepare(`
          DELETE FROM t_post
          WHERE id IN (${ids.join(',')})
        `).run();
      }
    }

    return json({ success: true, message: "成功清理文章，每个分类保留最新的20条" });
  } catch (error) {
    console.error("Error cleaning posts:", error);
    return json(
      { success: false, message: "清理文章失败，请查看控制台获取详细信息" },
      { status: 500 }
    );
  }
}

export default function CleanPosts() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              清理文章数据
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>将为每个分类只保留最新的20条文章，其余文章将被删除。</p>
            </div>
            <Form method="post" className="mt-5">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                开始清理
              </button>
            </Form>
            {actionData && (
              <div className={`mt-4 text-sm ${actionData.success ? 'text-green-600' : 'text-red-600'}`}>
                {actionData.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
