import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, useLoaderData } from "@remix-run/react";
import { useState } from "react";

interface Category {
  id: number;
  name: string;
  value: string;
  post_count: number;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database };

  const categoriesQuery = `
    SELECT c.*, COUNT(p.id) as post_count 
    FROM t_class c 
    LEFT JOIN t_post p ON c.id = p.class_id 
    GROUP BY c.id 
    ORDER BY c.id DESC
  `;
  const categories = await env.DB.prepare(categoriesQuery).all<Category>();

  return json({ categories: categories.results });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database };
  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "create") {
    const name = formData.get("name") as string;
    const value = name.toLowerCase().replace(/\s+/g, '-'); // 将名称转换为URL友好的值

    if (!name) {
      return json({ error: "分类名称不能为空" }, { status: 400 });
    }

    await env.DB.prepare(
      "INSERT INTO t_class (name, value) VALUES (?, ?)"
    ).bind(name, value).run();

    return redirect("/admin/categories");
  }

  if (action === "delete") {
    const categoryId = formData.get("categoryId");

    // Move posts in this category to uncategorized
    await env.DB.prepare(
      "UPDATE t_post SET class_id = NULL WHERE class_id = ?"
    ).bind(categoryId).run();

    // Delete the category
    await env.DB.prepare(
      "DELETE FROM t_class WHERE id = ?"
    ).bind(categoryId).run();

    return redirect("/admin/categories");
  }

  if (action === "update") {
    const categoryId = formData.get("categoryId");
    const name = formData.get("name") as string;
    const value = name.toLowerCase().replace(/\s+/g, '-'); // 将名称转换为URL友好的值

    if (!name) {
      return json({ error: "分类名称不能为空" }, { status: 400 });
    }

    await env.DB.prepare(
      "UPDATE t_class SET name = ?, value = ? WHERE id = ?"
    ).bind(name, value, categoryId).run();

    return redirect("/admin/categories");
  }

  return null;
}

export default function AdminCategories() {
  const { categories } = useLoaderData<typeof loader>();
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">新建分类</h2>
        <Form method="post" className="flex gap-4">
          <input type="hidden" name="_action" value="create" />
          <input
            type="text"
            name="name"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="输入分类名称"
          />
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            创建
          </button>
        </Form>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {categories.map((category) => (
            <li key={category.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  {editId === category.id ? (
                    <Form method="post" className="flex-1 flex gap-4">
                      <input type="hidden" name="_action" value="update" />
                      <input type="hidden" name="categoryId" value={category.id} />
                      <input
                        type="text"
                        name="name"
                        defaultValue={category.name}
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditId(null)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          取消
                        </button>
                      </div>
                    </Form>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {category.name}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500">
                          {category.post_count} 篇文章
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <button
                          type="button"
                          onClick={() => setEditId(category.id)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          编辑
                        </button>
                        {deleteId === category.id ? (
                          <div className="flex items-center space-x-2">
                            <Form method="post">
                              <input type="hidden" name="_action" value="delete" />
                              <input type="hidden" name="categoryId" value={category.id} />
                              <button
                                type="submit"
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                              >
                                确认删除
                              </button>
                            </Form>
                            <button
                              type="button"
                              onClick={() => setDeleteId(null)}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteId(category.id)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
