import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import Layout from "~/components/Layout";

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

interface Post {
  id: number;
  title: string;
  content: string;
  views: number;
  created_at: number;
  class_name: string;
  class_value: string;
}

interface LoaderData {
  posts: Post[];
  categories: Category[];
  labels: Label[];
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database };
  const url = new URL(request.url);
  const currentPage = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "5");

  try {
    // 获取文章总数
    const totalResult = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM t_post
    `).first<{ total: number }>();

    const total = totalResult?.total || 0;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (currentPage - 1) * pageSize;

    // 获取文章列表
    const posts = await env.DB.prepare(`
      SELECT 
        p.id,
        p.title,
        p.content,
        p.views,
        p.created_at,
        c.name as class_name,
        c.value as class_value
      FROM t_post p
      LEFT JOIN t_class c ON p.class_id = c.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(pageSize, offset).all<Post>();

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

    return json<LoaderData>({
      posts: posts.results || [],
      categories: categories.results || [],
      labels: labels.results || [],
      pagination: {
        total,
        totalPages,
        currentPage,
        pageSize,
      },
    });
  } catch (error) {
    console.error("Error loading data:", error);
    throw new Response("加载数据失败", { status: 500 });
  }
}

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  return (
    <Layout data={data}>
      <div className="space-y-6">
        {data.posts.map((post) => (
          <article key={post.id} className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">
                <Link to={`/post/${post.id}`} className="text-gray-900 hover:text-blue-600">
                  {post.title}
                </Link>
              </h2>
              <div className="text-sm text-gray-500 mb-4">
                <Link to={`/category/${post.class_value}`} className="hover:text-blue-600">
                  {post.class_name || '未分类'}
                </Link>
                <span className="mx-2">·</span>
                <span>{new Date(post.created_at * 1000).toLocaleDateString()}</span>
                <span className="mx-2">·</span>
                <span>{post.views} 次阅读</span>
              </div>
              <p 
                className="text-gray-600 line-clamp-3"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
              <div className="mt-4">
                <Link
                  to={`/post/${post.id}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  阅读全文 →
                </Link>
              </div>
            </div>
          </article>
        ))}

        {/* Pagination */}
        {data.pagination.totalPages > 1 && (
          <nav className="flex justify-center mt-8">
            <ul className="flex space-x-2">
              {data.pagination.currentPage > 1 && (
                <li>
                  <Link
                    to={`?page=${data.pagination.currentPage - 1}`}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    上一页
                  </Link>
                </li>
              )}
              
              {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1)
                .filter(page => {
                  const current = data.pagination.currentPage;
                  return page === 1 || 
                         page === data.pagination.totalPages || 
                         Math.abs(page - current) <= 2;
                })
                .map((page, i, arr) => {
                  if (i > 0 && arr[i - 1] !== page - 1) {
                    return (
                      <li key={`ellipsis-${page}`}>
                        <span className="px-3 py-2">...</span>
                      </li>
                    );
                  }
                  return (
                    <li key={page}>
                      <Link
                        to={`?page=${page}`}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          page === data.pagination.currentPage
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </Link>
                    </li>
                  );
                })}

              {data.pagination.currentPage < data.pagination.totalPages && (
                <li>
                  <Link
                    to={`?page=${data.pagination.currentPage + 1}`}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    下一页
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        )}
      </div>
    </Layout>
  );
}
