import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import Layout from "~/components/Layout";

interface Post {
  id: number;
  title: string;
  content: string;
  views: number;
  created_at: number;
  class_name: string;
}

interface Label {
  nickname: string;
  label_name: string;
}

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const env = context.env as { DB: D1Database };
  const postId = parseInt(params.id);

  if (isNaN(postId)) {
    throw new Response("Invalid post ID", { status: 400 });
  }

  // Get post with category name
  const postQuery = `
    SELECT p.*, c.name as class_name 
    FROM t_post p 
    LEFT JOIN t_class c ON p.class_id = c.id 
    WHERE p.id = ?
  `;
  const post = await env.DB.prepare(postQuery).bind(postId).first<Post>();
  
  if (!post) {
    throw new Response("Post not found", { status: 404 });
  }

  // Get labels for this post
  const labelsQuery = `
    SELECT nickname, label_name 
    FROM t_label 
    WHERE post_id = ?
  `;
  const labels = await env.DB.prepare(labelsQuery).bind(postId).all<Label>();

  // Update view count
  await env.DB.prepare(
    "UPDATE t_post SET views = views + 1 WHERE id = ?"
  ).bind(postId).run();

  // Get categories with post count
  const categoriesQuery = `
    SELECT 
      c.id,
      c.name,
      c.value,
      COUNT(p.id) as post_count
    FROM t_class c
    LEFT JOIN t_post p ON c.id = p.class_id
    GROUP BY c.id
    ORDER BY c.name
  `;
  const categories = await env.DB.prepare(categoriesQuery).all();

  // Get hot labels with post count
  const hotLabelsQuery = `
    SELECT 
      label_name,
      COUNT(*) as post_count
    FROM t_label
    GROUP BY label_name
    ORDER BY post_count DESC
    LIMIT 10
  `;
  const hotLabels = await env.DB.prepare(hotLabelsQuery).all();

  return json({
    post,
    labels: labels.results,
    categories: categories.results,
    hotLabels: hotLabels.results.map((label: any) => ({
      id: label.label_name, // 使用label_name作为id
      label_name: label.label_name,
      post_count: label.post_count
    }))
  });
};

export default function PostDetail() {
  const { post, labels, categories, hotLabels } = useLoaderData<typeof loader>();

  // Validate and format timestamp
  const formatDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
      if (isNaN(date.getTime())) {
        return '时间未知';
      }
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '时间未知';
    }
  };

  return (
    <Layout data={{ categories, labels: hotLabels }}>
      <article className="h-full overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>
          <div className="flex items-center text-sm text-gray-500 space-x-4">
            <time dateTime={new Date(post.created_at * 1000).toISOString()}>
              {formatDate(post.created_at)}
            </time>
            <span>·</span>
            <span>{post.class_name || '未分类'}</span>
            <span>·</span>
            <span>{post.views} 次阅读</span>
          </div>
        </header>

        <div 
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {labels && labels.length > 0 && (
          <div className="mt-8 pt-8 border-t">
            <h2 className="text-xl font-semibold mb-4">标签</h2>
            <div className="flex flex-wrap gap-2">
              {labels.map((label, index) => (
                <div
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  <span className="mr-2">{label.label_name}</span>
                  <span className="text-xs text-blue-600">by {label.nickname}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>
    </Layout>
  );
}
