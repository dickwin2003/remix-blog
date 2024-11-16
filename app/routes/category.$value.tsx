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
}

interface Label {
  id: number;
  nickname: string;
  label_name: string;
  post_id: number;
  post_count: number;
}

interface LoaderData {
  category: Category;
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
  const { value } = params;
  const url = new URL(request.url);
  const currentPage = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "5");

  if (!value) {
    throw new Response("分类参数不能为空", { status: 400 });
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

    // 获取当前分类信息
    const category = await env.DB.prepare(
      "SELECT * FROM t_class WHERE value = ?"
    ).bind(value).first<Category>();

    if (!category) {
      throw new Response("分类不存在", { status: 404 });
    }

    // 获取总数
    const totalResult = await env.DB.prepare(`
      SELECT COUNT(*) as total
      FROM t_post
      WHERE class_id = ?
    `).bind(category.id).first<{ total: number }>();

    const total = totalResult?.total || 0;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (currentPage - 1) * pageSize;

    // 获取该分类下的文章（分页）
    const result = await env.DB.prepare(`
      SELECT id, title, content, views, created_at
      FROM t_post
      WHERE class_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(category.id, pageSize, offset).all<Post>();

    return json({
      category,
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
    console.error("Error loading category posts:", error);
    throw new Response("加载分类文章失败", { status: 500 });
  }
}

export default function CategoryPosts() {
  const data = useLoaderData<typeof loader>();
  const { category, categories, labels, posts, pagination } = data;
  const [searchParams, setSearchParams] = useSearchParams();

  // 生成页码数组
  const pageNumbers = [];
  const maxVisiblePages = 5;
  const startPage = Math.max(
    1,
    pagination.currentPage - Math.floor(maxVisiblePages / 2)
  );
  const endPage = Math.min(
    pagination.totalPages,
    startPage + maxVisiblePages - 1
  );

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  // 处理分页大小变化
  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = event.target.value;
    searchParams.set("pageSize", newPageSize);
    searchParams.set("page", "1"); // 重置到第一页
    setSearchParams(searchParams);
  };

  // 生成页面链接的辅助函数
  const getPageLink = (page: number) => {
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
              {category.name}
            </h1>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">每页显示：</span>
              <select
                value={pagination.pageSize}
                onChange={handlePageSizeChange}
                className="rounded border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {PAGE_SIZES.map(size => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">该分类下暂无文章</p>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/post/${post.id}`}
                    className="block"
                  >
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="px-4 py-5 sm:p-6">
                        <h2 className="text-xl font-medium text-gray-900 hover:text-blue-600 transition-colors duration-200">
                          {post.title}
                        </h2>
                        <p 
                          className="mt-2 text-gray-600 line-clamp-3"
                          dangerouslySetInnerHTML={{ __html: post.content }}
                        />
                        <div className="mt-4 flex justify-between text-sm text-gray-500">
                          <span>
                            阅读量：{post.views}
                          </span>
                          <span>
                            发布于：{new Date(post.created_at * 1000).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* 分页控件 */}
              <div className="mt-6">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    共 {pagination.total} 条记录，
                    每页 {pagination.pageSize} 条，
                    当前第 {pagination.currentPage}/{pagination.totalPages} 页
                  </div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {/* 首页 */}
                    <Link
                      to={getPageLink(1)}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                        pagination.currentPage === 1
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      首页
                    </Link>

                    {/* 上一页 */}
                    <Link
                      to={getPageLink(Math.max(1, pagination.currentPage - 1))}
                      className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                        pagination.currentPage === 1
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      上一页
                    </Link>

                    {/* 页码 */}
                    {pageNumbers.map((page) => (
                      <Link
                        key={page}
                        to={getPageLink(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.currentPage
                            ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </Link>
                    ))}

                    {/* 下一页 */}
                    <Link
                      to={getPageLink(Math.min(pagination.totalPages, pagination.currentPage + 1))}
                      className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                        pagination.currentPage === pagination.totalPages
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      下一页
                    </Link>

                    {/* 末页 */}
                    <Link
                      to={getPageLink(pagination.totalPages)}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                        pagination.currentPage === pagination.totalPages
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      末页
                    </Link>
                  </nav>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
