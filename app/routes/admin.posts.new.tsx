import { json, redirect, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import RichTextEditor from "~/components/RichTextEditor";

interface LoaderData {
  categories: Array<{
    id: number;
    name: string;
  }>;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database };
  const formData = await request.formData();
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const classId = formData.get("classId") as string;

  if (!title || !content) {
    return json(
      { error: "标题和内容不能为空" },
      { status: 400 }
    );
  }

  // 使用 Date.now() / 1000 获取秒级时间戳
  const currentTime = Math.floor(Date.now() / 1000);

  // 插入文章
  const result = await env.DB.prepare(
    "INSERT INTO t_post (title, content, class_id, created_at, views) VALUES (?, ?, ?, ?, 0)"
  ).bind(title, content, classId || null, currentTime).run();

  if (!result.success) {
    return json(
      { error: "创建文章失败" },
      { status: 500 }
    );
  }

  return redirect("/admin/posts");
}

export async function loader({ context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database };
  
  // 获取所有分类
  const categories = await env.DB.prepare(
    "SELECT id, name FROM t_class ORDER BY name"
  ).all();

  return json({ categories: categories.results });
}

export default function NewPost() {
  const { categories } = useLoaderData<LoaderData>();
  const actionData = useActionData<typeof action>();
  const titleRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (actionData?.error) {
      titleRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">新建文章</h2>
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="classId" className="block text-sm font-medium text-gray-700">
            分类
          </label>
          <select
            name="classId"
            id="classId"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">请选择分类</option>
            {categories.map((category) => (
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
          <input type="hidden" name="content" value={content} />
          <div className="mt-1">
            <RichTextEditor
              initialValue={content}
              onChange={setContent}
            />
          </div>
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
