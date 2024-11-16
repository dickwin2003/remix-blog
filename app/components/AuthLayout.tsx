import { Link } from "@remix-run/react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-blue-900">
              <Link to="/" className="hover:text-blue-600 transition duration-200">
                小格信息塞特
              </Link>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow flex items-center justify-center">
        {children}
      </div>

      <footer className="bg-white shadow-sm border-t border-blue-100">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-blue-600 space-y-2">
            <div>
              小格信息塞特 {new Date().getFullYear()}.
              <a 
                href="https://beian.miit.gov.cn/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-blue-800 transition duration-200 ml-2"
              >
                粤ICP备2024331488号-1
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
