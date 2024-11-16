import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { Link, useLoaderData, useNavigate, Form, useSearchParams } from "@remix-run/react";
import { useState, Fragment, useRef, useEffect } from "react";
import { Dialog, Transition } from '@headlessui/react';
import { Editor } from "@tinymce/tinymce-react";

interface LoaderData {
  posts: Array<{
    id: number;
    title: string;
    created_at: number;
    class_name: string | null;
    views: number;
  }>;
  categories: Array<{
    id: number;
    name: string;
    value: string;
  }>;
  message?: string;
  error?: string;
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
  editPost?: {
    id: number;
    title: string;
    content: string;
    class_id: number;
  };
}

interface RootData {
  env: {
    TINYMCE_API_KEY: string;
  };
}

export async function loader({ context, request }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database; TINYMCE_API_KEY: string };
  const url = new URL(request.url);
  const message = url.searchParams.get('message');
  const error = url.searchParams.get('error');
  const currentPage = parseInt(url.searchParams.get("page") || "1");
  const pageSize = 5; // 固定每页显示5条
  const categoryId = url.searchParams.get("category");
  const editId = url.searchParams.get("editId");

  // 构建基础查询
  let baseQuery = `
    SELECT p.id, p.title, p.created_at, c.name as class_name, p.views 
    FROM t_post p 
    LEFT JOIN t_class c ON p.class_id = c.id
  `;
  let countQuery = "SELECT COUNT(*) as total FROM t_post p";
  let queryParams: any[] = [];

  // 如果有分类过滤
  if (categoryId) {
    baseQuery += " WHERE p.class_id = ?";
    countQuery += " WHERE p.class_id = ?";
    queryParams.push(categoryId);
  }

  // 添加排序和分页
  baseQuery += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
  queryParams.push(pageSize, (currentPage - 1) * pageSize);

  // 获取总记录数
  const totalResult = categoryId
    ? await env.DB.prepare(countQuery).bind(categoryId).first<{ total: number }>()
    : await env.DB.prepare(countQuery).first<{ total: number }>();

  const total = totalResult?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // 获取文章列表
  const posts = await env.DB.prepare(baseQuery).bind(...queryParams).all();

  // 获取所有分类
  const categories = await env.DB.prepare(`
    SELECT c.*, COUNT(p.id) as post_count 
    FROM t_class c 
    LEFT JOIN t_post p ON c.id = p.class_id 
    GROUP BY c.id 
    ORDER BY c.name
  `).all();

  let editPost: LoaderData['editPost'] | undefined;
  if (editId) {
    const postResult = await env.DB.prepare("SELECT * FROM t_post WHERE id = ?").bind(editId).first();
    if (postResult) {
      editPost = {
        id: postResult.id,
        title: postResult.title,
        content: postResult.content,
        class_id: postResult.class_id,
      };
    }
  }

  return json<LoaderData & RootData>({ 
    posts: posts.results,
    categories: categories.results,
    message,
    error,
    pagination: {
      total,
      totalPages,
      currentPage,
      pageSize
    },
    editPost,
    env: {
      TINYMCE_API_KEY: env.TINYMCE_API_KEY,
    },
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "create") {
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const category = formData.get("category") as string;

    if (!title || !content || !category) {
      return json({ error: "标题、内容和分类都是必填项" }, { status: 400 });
    }

    try {
      const db = context.env.DB as D1Database;
      await db.prepare(
        "INSERT INTO t_post (title, content, class_id, created_at, views) VALUES (?, ?, ?, unixepoch(), 0)"
      ).bind(title, content, category).run();

      return redirect("/admin/posts?message=" + encodeURIComponent("文章创建成功"));
    } catch (error) {
      console.error("创建文章失败:", error);
      return json({ error: "创建文章失败：" + (error as Error).message }, { status: 500 });
    }
  }

  if (action === "delete") {
    const postId = formData.get("postId");
    if (!postId) {
      return json({ error: "文章ID不能为空" }, { status: 400 });
    }

    try {
      const db = context.env.DB as D1Database;
      const result = await db.prepare("DELETE FROM t_post WHERE id = ?").bind(postId).run();
      
      if (result.changes === 0) {
        return json({ error: "文章不存在或已被删除" }, { status: 404 });
      }

      return redirect("/admin/posts?message=" + encodeURIComponent("文章删除成功"));
    } catch (error) {
      console.error("删除文章失败:", error);
      return json({ error: "删除文章失败：" + (error as Error).message }, { status: 500 });
    }
  }

  if (action === "update") {
    const postId = formData.get("postId");
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const category = formData.get("category") as string;

    if (!postId || !title || !content || !category) {
      return json({ error: "文章ID、标题、内容和分类都是必填项" }, { status: 400 });
    }

    try {
      const db = context.env.DB as D1Database;
      await db.prepare(
        "UPDATE t_post SET title = ?, content = ?, class_id = ? WHERE id = ?"
      ).bind(title, content, category, postId).run();

      return redirect("/admin/posts?message=" + encodeURIComponent("文章更新成功"));
    } catch (error) {
      console.error("更新文章失败:", error);
      return json({ error: "更新文章失败：" + (error as Error).message }, { status: 500 });
    }
  }

  return json({ error: "无效的操作" }, { status: 400 });
}

export default function Posts() {
  const { posts, categories, message, error, pagination, editPost, env } = useLoaderData<LoaderData & RootData>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (editPost) {
      setIsEditModalOpen(true);
      setEditContent(editPost.content);
    }
  }, [editPost]);

  function openEditModal(postId: number) {
    const params = new URLSearchParams(searchParams);
    params.set("editId", postId.toString());
    setSearchParams(params);
  }

  function openDeleteModal(postId: number) {
    setSelectedPostId(postId);
    setIsDeleteModalOpen(true);
  }

  // 辅助函数：生成带有当前查询参数的新 URL
  const getUrlWithParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    return `?${params.toString()}`;
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">文章管理</h1>
          <p className="mt-2 text-sm text-gray-700">
            管理所有的博客文章
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex space-x-4">
          <select
            onChange={(e) => {
              const params = new URLSearchParams(searchParams);
              if (e.target.value) {
                params.set("category", e.target.value);
              } else {
                params.delete("category");
              }
              params.set("page", "1");
              setSearchParams(params);
            }}
            className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            defaultValue={searchParams.get("category") || ""}
          >
            <option value="">所有分类</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.post_count})
              </option>
            ))}
          </select>
          <button
            onClick={() => setIsNewPostModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            新建文章
          </button>
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{message}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      标题
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      分类
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      阅读量
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      创建时间
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {posts.map((post) => (
                    <tr key={post.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {post.title}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {post.class_name || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {post.views}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(post.created_at * 1000).toLocaleString()}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button
                          onClick={() => openEditModal(post.id)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => openDeleteModal(post.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <nav className="flex justify-between">
          <div>
            <p className="text-sm text-gray-700">
              显示 {pagination.pageSize} 条记录，共 {pagination.total} 条记录
            </p>
          </div>
          <div className="flex justify-end">
            {pagination.currentPage > 1 && (
              <Link
                to={getUrlWithParams({ page: (pagination.currentPage - 1).toString() })}
                className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
              >
                上一页
              </Link>
            )}
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <Link
                key={page}
                to={getUrlWithParams({ page: page.toString() })}
                className={`relative inline-flex items-center border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 ${
                  pagination.currentPage === page ? "bg-gray-100" : ""
                }`}
              >
                {page}
              </Link>
            ))}
            {pagination.currentPage < pagination.totalPages && (
              <Link
                to={getUrlWithParams({ page: (pagination.currentPage + 1).toString() })}
                className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
              >
                下一页
              </Link>
            )}
          </div>
        </nav>
      </div>

      {/* 新增文章弹出框 */}
      <Transition.Root show={isNewPostModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={setIsNewPostModalOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:p-6">
                  <div>
                    <div className="mt-3 text-center sm:mt-0 sm:text-left">
                      <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 border-b pb-3">
                        新建文章
                      </Dialog.Title>
                      <div className="mt-4">
                        <Form method="post" className="space-y-4">
                          <input type="hidden" name="_action" value="create" />
                          <input type="hidden" name="content" value={newContent} />

                          <div>
                            <label htmlFor="new-title" className="block text-sm font-medium text-gray-700">
                              标题
                            </label>
                            <input
                              type="text"
                              name="title"
                              id="new-title"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              required
                            />
                          </div>

                          <div>
                            <label htmlFor="new-category" className="block text-sm font-medium text-gray-700">
                              分类
                            </label>
                            <select
                              name="category"
                              id="new-category"
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
                            <label htmlFor="new-content" className="block text-sm font-medium text-gray-700">
                              内容
                            </label>
                            <div className="mt-1">
                              {isClient ? (
                                <Editor
                                  id="new-content"
                                  apiKey={env.TINYMCE_API_KEY}
                                  init={{
                                    height: 400,
                                    menubar: true,
                                    plugins: [
                                      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                      'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
                                      'emoticons', 'template', 'paste', 'textcolor', 'hr', 'pagebreak',
                                      'nonbreaking', 'charmap', 'quickbars', 'searchreplace', 'visualchars',
                                      'directionality'
                                    ],
                                    toolbar: [
                                      'undo redo | styles | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify',
                                      'bullist numlist outdent indent | link image media table | forecolor backcolor | charmap emoticons | fullscreen code'
                                    ].join(' | '),
                                    style_formats: [
                                      { title: '标题 1', format: 'h1' },
                                      { title: '标题 2', format: 'h2' },
                                      { title: '标题 3', format: 'h3' },
                                      { title: '段落', format: 'p' },
                                      { title: '引用', format: 'blockquote' },
                                      { title: '代码', format: 'code' }
                                    ],
                                    content_style: `
                                      body { font-family:Helvetica,Arial,sans-serif; font-size:14px }
                                      blockquote { border-left: 3px solid #ccc; margin-left: 1.5em; padding-left: 1em; }
                                      code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 4px; }
                                      table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
                                      table th, table td { border: 1px solid #ddd; padding: 8px; }
                                      table th { background-color: #f8f9fa; }
                                      table tr:nth-child(even) { background-color: #f8f9fa; }
                                      table tr:hover { background-color: #f5f5f5; }
                                    `,
                                    language: 'zh_CN',
                                    branding: false,
                                    promotion: false,
                                    relative_urls: false,
                                    remove_script_host: false,
                                    convert_urls: true,
                                    document_base_url: window.location.origin,
                                  }}
                                  value={newContent}
                                  onEditorChange={(content) => {
                                    setNewContent(content);
                                  }}
                                />
                              ) : (
                                <div className="h-[400px] border rounded-md bg-gray-50 flex items-center justify-center">
                                  <span className="text-gray-500">加载编辑器中...</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                            <button
                              type="submit"
                              className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm"
                              onClick={() => {
                                setTimeout(() => {
                                  setIsNewPostModalOpen(false);
                                }, 100);
                              }}
                            >
                              保存
                            </button>
                            <button
                              type="button"
                              className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                              onClick={() => setIsNewPostModalOpen(false)}
                            >
                              取消
                            </button>
                          </div>
                        </Form>
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* 编辑文章弹出框 */}
      <Transition.Root show={isEditModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => {
          setIsEditModalOpen(false);
          const params = new URLSearchParams(searchParams);
          params.delete("editId");
          setSearchParams(params);
        }}>
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div>
                    <div className="mt-3 text-center sm:mt-0 sm:text-left">
                      <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 border-b pb-3">
                        编辑文章
                      </Dialog.Title>
                      <div className="mt-4">
                        <Form method="post" className="space-y-4">
                          <input type="hidden" name="_action" value="update" />
                          <input type="hidden" name="postId" value={editPost?.id} />
                          <input type="hidden" name="content" value={editContent} />

                          <div>
                            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700">
                              标题
                            </label>
                            <input
                              type="text"
                              name="title"
                              id="edit-title"
                              defaultValue={editPost?.title}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              required
                            />
                          </div>

                          <div>
                            <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700">
                              分类
                            </label>
                            <select
                              name="category"
                              id="edit-category"
                              defaultValue={editPost?.class_id}
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
                            <label htmlFor="edit-content" className="block text-sm font-medium text-gray-700">
                              内容
                            </label>
                            <input type="hidden" name="content" value={editContent} />
                            <div className="mt-1">
                              {isClient ? (
                                <Editor
                                  id="edit-content"
                                  apiKey={env.TINYMCE_API_KEY}
                                  init={{
                                    height: 400,
                                    menubar: true,
                                    plugins: [
                                      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                      'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
                                      'emoticons', 'template', 'paste', 'textcolor', 'hr', 'pagebreak',
                                      'nonbreaking', 'charmap', 'quickbars', 'searchreplace', 'visualchars',
                                      'directionality'
                                    ],
                                    toolbar: [
                                      'undo redo | styles | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify',
                                      'bullist numlist outdent indent | link image media table | forecolor backcolor | charmap emoticons | fullscreen code'
                                    ].join(' | '),
                                    style_formats: [
                                      { title: '标题 1', format: 'h1' },
                                      { title: '标题 2', format: 'h2' },
                                      { title: '标题 3', format: 'h3' },
                                      { title: '段落', format: 'p' },
                                      { title: '引用', format: 'blockquote' },
                                      { title: '代码', format: 'code' }
                                    ],
                                    content_style: `
                                      body { font-family:Helvetica,Arial,sans-serif; font-size:14px }
                                      blockquote { border-left: 3px solid #ccc; margin-left: 1.5em; padding-left: 1em; }
                                      code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 4px; }
                                      table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
                                      table th, table td { border: 1px solid #ddd; padding: 8px; }
                                      table th { background-color: #f8f9fa; }
                                      table tr:nth-child(even) { background-color: #f8f9fa; }
                                      table tr:hover { background-color: #f5f5f5; }
                                    `,
                                    language: 'zh_CN',
                                    branding: false,
                                    promotion: false,
                                    relative_urls: false,
                                    remove_script_host: false,
                                    convert_urls: true,
                                    document_base_url: window.location.origin,
                                  }}
                                  value={editContent}
                                  onEditorChange={(content) => {
                                    setEditContent(content);
                                  }}
                                />
                              ) : (
                                <div className="h-[400px] border rounded-md bg-gray-50 flex items-center justify-center">
                                  <span className="text-gray-500">加载编辑器中...</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                            <button
                              type="submit"
                              className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm"
                              onClick={() => {
                                setTimeout(() => {
                                  setIsEditModalOpen(false);
                                  const params = new URLSearchParams(searchParams);
                                  params.delete("editId");
                                  setSearchParams(params);
                                }, 100);
                              }}
                            >
                              保存
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditModalOpen(false);
                                const params = new URLSearchParams(searchParams);
                                params.delete("editId");
                                setSearchParams(params);
                              }}
                              className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                            >
                              取消
                            </button>
                          </div>
                        </Form>
                      </div>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* 删除确认弹出框 */}
      <Transition.Root show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsDeleteModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    确认删除
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      确定要删除这篇文章吗？此操作无法撤销。
                    </p>
                  </div>

                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={() => setIsDeleteModalOpen(false)}
                    >
                      取消
                    </button>
                    <Form method="post">
                      <input type="hidden" name="postId" value={selectedPostId || ''} />
                      <input type="hidden" name="_action" value="delete" />
                      <button
                        type="submit"
                        className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                        onClick={() => setIsDeleteModalOpen(false)}
                      >
                        删除
                      </button>
                    </Form>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
}
