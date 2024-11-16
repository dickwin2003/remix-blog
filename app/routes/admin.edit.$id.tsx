import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData, useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import RichTextEditor from "~/components/RichTextEditor";

interface Category {
  id: number;
  name: string;
  value: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  class_id: number;
}

export async function loader({ params, context }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database; TINYMCE_API_KEY: string };
  const postId = params.id;

  if (!postId) {
    throw new Response("文章ID不能为空", { status: 400 });
  }

  try {
    // 获取文章信息
    const post = await env.DB.prepare(
      "SELECT id, title, content, class_id FROM t_post WHERE id = ?"
    ).bind(postId).first<Post>();

    if (!post) {
      throw new Response("文章不存在", { status: 404 });
    }

    // 获取分类列表
    const categories = await env.DB.prepare(
      "SELECT id, name, value FROM t_class ORDER BY name"
    ).all<Category>();

    return json({
      post,
      categories: categories.results || [],
      apiKey: env.TINYMCE_API_KEY
    });
  } catch (error) {
    console.error("Error loading post:", error);
    throw new Response("加载文章失败", { status: 500 });
  }
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database };
  const formData = await request.formData();
  const postId = params.id;
  
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const classId = parseInt(formData.get("classId") as string);
  
  if (!title || !content || !classId || !postId) {
    return json({ error: "标题、内容和分类都是必填项" }, { status: 400 });
  }

  try {
    // 更新文章
    await env.DB.prepare(
      `UPDATE t_post 
       SET title = ?, content = ?, class_id = ?, updated_at = ?
       WHERE id = ?`
    ).bind(
      title,
      content,
      classId,
      Math.floor(Date.now() / 1000),
      postId
    ).run();

    return json({ success: true });
  } catch (error) {
    console.error("Error updating post:", error);
    return json({ error: "更新文章失败" }, { status: 500 });
  }
}

export default function EditPost() {
  const { post, categories, apiKey } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const [content, setContent] = useState(post.content);

  // 如果更新成功，跳转到文章列表页
  if (actionData?.success) {
    navigate("/admin");
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">编辑文章</h1>
      
      <Form method="post" className="space-y-6">
        {actionData?.error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-md">
            {actionData.error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            标题
          </label>
          <input
            type="text"
            name="title"
            id="title"
            defaultValue={post.title}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="classId" className="block text-sm font-medium text-gray-700">
            分类
          </label>
          <select
            name="classId"
            id="classId"
            defaultValue={post.class_id}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            内容
          </label>
          <RichTextEditor
            initialValue={post.content}
            onChange={(newContent) => {
              setContent(newContent);
            }}
            apiKey={apiKey}
          />
          <input type="hidden" name="content" value={content} />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            取消
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            更新
          </button>
        </div>
      </Form>
    </div>
  );
}
