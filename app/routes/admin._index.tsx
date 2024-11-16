import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";

interface DashboardStats {
  totalPosts: number;
  totalCategories: number;
  recentEvents: Array<{
    id: number;
    username: string;
    event_type: string;
    ip_address: string;
    created_at: number;
  }>;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database };

  // Get total posts count
  const postsCount = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM t_post"
  ).first<{ count: number }>();

  // Get total categories count
  const categoriesCount = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM t_class"
  ).first<{ count: number }>();

  // Get recent events
  const recentEvents = await env.DB.prepare(`
    SELECT id, username, event_type, ip_address, created_at 
    FROM t_event 
    ORDER BY created_at DESC 
    LIMIT 10
  `).all();

  return json<DashboardStats>({
    totalPosts: postsCount?.count || 0,
    totalCategories: categoriesCount?.count || 0,
    recentEvents: recentEvents.results,
  });
}

export default function AdminIndex() {
  const { totalPosts, totalCategories, recentEvents } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">仪表盘</h2>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">文章总数</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalPosts}</dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">分类总数</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalCategories}</dd>
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">最近事件</h3>
          <div className="mt-4">
            <div className="flex flex-col">
              <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                  <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            用户
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            事件类型
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            IP地址
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            时间
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentEvents.map((event) => (
                          <tr key={event.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {event.username}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {event.event_type === 'login' && '登录'}
                              {event.event_type === 'visit' && '访问'}
                              {event.event_type === 'label' && '标签'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {event.ip_address}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(event.created_at * 1000).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
