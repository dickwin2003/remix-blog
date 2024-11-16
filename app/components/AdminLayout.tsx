import { Form, Link } from "@remix-run/react";

interface AdminLayoutProps {
  children: React.ReactNode;
  username: string;
}

export default function AdminLayout({ children, username }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <Link to="/admin" className="text-xl font-semibold text-blue-600">
                后台管理
              </Link>
              <nav className="space-x-4">
                <Link to="/admin/posts" className="text-gray-600 hover:text-blue-600">
                  文章管理
                </Link>
                <Link to="/admin/categories" className="text-gray-600 hover:text-blue-600">
                  分类管理
                </Link>
                <Link to="/" className="text-gray-600 hover:text-blue-600">
                  返回首页
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                欢迎，{username}
              </span>
              <Form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  退出登录
                </button>
              </Form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white shadow-sm mt-8">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center text-gray-600">
            {new Date().getFullYear()} 小格信息塞特
          </div>
        </div>
      </footer>
    </div>
  );
}
