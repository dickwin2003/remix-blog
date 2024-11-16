import { Link } from "@remix-run/react";

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

interface LayoutProps {
  children: React.ReactNode;
  data?: {
    categories: Category[];
    labels: Label[];
  };
}

export default function Layout({ children, data }: LayoutProps) {
  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-blue-900">
              <Link to="/" className="hover:text-blue-600 transition duration-200">小格信息塞特</Link>
            </h1>
            <Link to="/admin" className="text-blue-600 hover:text-blue-800 transition duration-200">
              管理
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-grow">
        <div className="max-w-[1400px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between">
            {/* Left Sidebar - Fixed width */}
            <div className="w-[300px] sticky top-8 self-start h-[calc(100vh-8rem)] overflow-y-auto">
              {/* Categories Section */}
              <div className="mb-8 bg-white rounded-lg shadow-sm p-6 border border-blue-100">
                <h2 className="text-xl font-semibold mb-4 text-blue-900 border-b border-blue-100 pb-2">文章分类</h2>
                <div className="space-y-2">
                  {data?.categories?.map((category) => (
                    <Link
                      key={category.id}
                      to={`/category/${category.value}`}
                      className="block text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded px-3 py-1.5 transition duration-200"
                    >
                      {category.name} ({category.post_count})
                    </Link>
                  ))}
                </div>
              </div>

              {/* Hot Tags Section */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-blue-100">
                <h2 className="text-xl font-semibold mb-4 text-blue-900 border-b border-blue-100 pb-2">热点标签</h2>
                <div className="space-y-2">
                  {data?.labels?.map((label) => (
                    <Link
                      key={label.id}
                      to={`/tag/${label.label_name}`}
                      className="block text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded px-3 py-1.5 transition duration-200"
                    >
                      {label.label_name} ({label.post_count})
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content - Fixed width */}
            <div className="w-[calc(100%-340px)] bg-white rounded-lg shadow-sm p-6 border border-blue-100">
              {children}
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-white shadow-sm border-t border-blue-100 mt-8">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-blue-600">小格信息塞特 {new Date().getFullYear()}</div>
        </div>
      </footer>
    </div>
  );
}
