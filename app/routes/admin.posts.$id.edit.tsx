import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useEffect, useRef } from "react";

export async function loader({ params, context }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database };
  const postId = params.id;

  // 获取文章详情
  const post = await env.DB.prepare(
    "SELECT * FROM t_post WHERE id = ?"
  ).bind(postId).first();

  if (!post) {
    throw new Response("文章不存在", { status: 404 });
  }

  // 获取所有分类
  const categories = await env.DB.prepare(
    "SELECT id, name FROM t_class ORDER BY name"
  ).all();

  return json({ post, categories: categories.results });
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database };
  const formData = await request.formData();
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const classId = formData.get("classId") as string;
  const postId = params.id;

  if (!title || !content) {
    return json(
      { error: "标题和内容不能为空" },
      { status: 400 }
    );
  }

  // 更新文章
  const result = await env.DB.prepare(
    "UPDATE t_post SET title = ?, content = ?, class_id = ? WHERE id = ?"
  ).bind(title, content, classId || null, postId).run();

  if (!result.success) {
    return json(
      { error: "更新文章失败" },
      { status: 500 }
    );
  }

  return redirect("/admin/posts");
}

export default function EditPost() {
  const { post, categories } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (actionData?.error) {
      // 如果有错误，聚焦到第一个输入框
      titleRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">编辑文章</h2>
      <Form method="post" className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            标题
          </label>
          <input
            ref={titleRef}
            type="text"
            name="title"
            id="title"
            defaultValue={post.title}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="classId" className="block text-sm font-medium text-gray-700">
            分类
          </label>
          <select
            id="classId"
            name="classId"
            defaultValue={post.class_id || ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">无分类</option>
            {categories.map((category: any) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">
            内容
          </label>
          <textarea
            ref={contentRef}
            name="content"
            id="content"
            defaultValue={post.content}
            rows={15}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required
          />
        </div>

        {actionData?.error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {actionData.error}
                </h3>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </Form>
    </div>
  );
}
