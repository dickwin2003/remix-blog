import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import Layout from "~/components/Layout";

interface Post {
  id: number;
  title: string;
  content: string;
  views: number;
  created_at: number;
}

interface Category {
  id: number;
  name: string;
  value: string;
  post_count: number;
}

interface Label {
  id: number;
  nickname: string;
  label_name: string;
  post_id: number;
  post_count: number;
}

interface LoaderData {
  tag_name: string;
  categories: Category[];
  labels: Label[];
  posts: Post[];
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

const PAGE_SIZES = [5, 10, 20];

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database };
  const { name } = params;
  const url = new URL(request.url);
  const currentPage = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "5");

  if (!name) {
    throw new Response("标签参数不能为空", { status: 400 });
  }

  try {
    // 获取所有分类
    const categories = await env.DB.prepare(`
      SELECT c.*, COUNT(p.id) as post_count 
      FROM t_class c 
      LEFT JOIN t_post p ON c.id = p.class_id 
      GROUP BY c.id 
      ORDER BY c.name
    `).all<Category>();

    // 获取所有标签
    const labels = await env.DB.prepare(`
      SELECT l.id, l.nickname, l.label_name, COUNT(DISTINCT l.post_id) as post_count
      FROM t_label l
      GROUP BY l.label_name
      ORDER BY l.created_at DESC
    `).all<Label>();

    // 获取标签下的文章总数
    const totalResult = await env.DB.prepare(`
      SELECT COUNT(DISTINCT p.id) as total
      FROM t_post p
      JOIN t_label l ON p.id = l.post_id
      WHERE l.label_name = ?
    `).bind(name).first<{ total: number }>();

    const total = totalResult?.total || 0;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (currentPage - 1) * pageSize;

    // 获取该标签下的文章（分页）
    const result = await env.DB.prepare(`
      SELECT DISTINCT p.id, p.title, p.content, p.views, p.created_at
      FROM t_post p
      JOIN t_label l ON p.id = l.post_id
      WHERE l.label_name = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(name, pageSize, offset).all<Post>();

    return json({
      tag_name: name,
      categories: categories.results || [],
      labels: labels.results || [],
      posts: result?.results || [],
      pagination: {
        total,
        totalPages,
        currentPage,
        pageSize,
      },
    });
  } catch (error) {
    console.error("Error loading tag posts:", error);
    throw new Response("加载标签文章失败", { status: 500 });
  }
}

export default function TagPosts() {
  const data = useLoaderData<typeof loader>();
  const { tag_name, categories, labels, posts, pagination } = data;
  const [searchParams, setSearchParams] = useSearchParams();

  // 生成页码数组
  const pageNumbers = [];
  const maxVisiblePages = 5;
  const startPage = Math.max(
    1,
    pagination.currentPage - Math.floor(maxVisiblePages / 2)
  );
  const endPage = Math.min(
    startPage + maxVisiblePages - 1,
    pagination.totalPages
  );

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams);
    params.set("pageSize", e.target.value);
    params.set("page", "1");
    setSearchParams(params);
  };

  const getPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    return `?${params.toString()}`;
  };

  return (
    <Layout data={{ categories, labels }}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              标签：{tag_name}
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">每页显示：</span>
              <select
                value={pagination.pageSize}
                onChange={handlePageSizeChange}
                className="border border-gray-300 rounded px-2 py-1"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-6">
            {posts.map((post) => (
              <article key={post.id} className="bg-white p-6 rounded-lg shadow">
                <Link
                  to={`/post/${post.id}`}
                  className="text-xl font-semibold text-blue-600 hover:text-blue-800"
                >
                  {post.title}
                </Link>
                <p className="mt-2 text-gray-600">
                  {post.content.length > 200
                    ? `${post.content.slice(0, 200)}...`
                    : post.content}
                </p>
                <div className="mt-4 text-sm text-gray-500">
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  <span className="mx-2">·</span>
                  <span>{post.views} 次阅读</span>
                </div>
              </article>
            ))}
          </div>

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <nav className="flex items-center space-x-2">
                {pagination.currentPage > 1 && (
                  <Link
                    to={getPageUrl(pagination.currentPage - 1)}
                    className="px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    上一页
                  </Link>
                )}

                {startPage > 1 && (
                  <>
                    <Link
                      to={getPageUrl(1)}
                      className="px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      1
                    </Link>
                    {startPage > 2 && (
                      <span className="text-gray-500">...</span>
                    )}
                  </>
                )}

                {pageNumbers.map((page) => (
                  <Link
                    key={page}
                    to={getPageUrl(page)}
                    className={`px-3 py-1 rounded border ${
                      page === pagination.currentPage
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </Link>
                ))}

                {endPage < pagination.totalPages && (
                  <>
                    {endPage < pagination.totalPages - 1 && (
                      <span className="text-gray-500">...</span>
                    )}
                    <Link
                      to={getPageUrl(pagination.totalPages)}
                      className="px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      {pagination.totalPages}
                    </Link>
                  </>
                )}

                {pagination.currentPage < pagination.totalPages && (
                  <Link
                    to={getPageUrl(pagination.currentPage + 1)}
                    className="px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    下一页
                  </Link>
                )}
              </nav>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
