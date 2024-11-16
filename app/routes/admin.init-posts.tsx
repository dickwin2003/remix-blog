import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData } from "@remix-run/react";
import { initializePosts } from "~/scripts/init-posts";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database };

  try {
    await initializePosts(env.DB);
    return json({ success: true, message: "成功为每个分类生成100条文章" });
  } catch (error) {
    console.error("Error initializing posts:", error);
    return json(
      { success: false, message: "生成文章失败，请查看控制台获取详细信息" },
      { status: 500 }
    );
  }
}

export default function InitPosts() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              初始化文章数据
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>
                此操作将为每个分类生成100条测试文章。请谨慎使用，操作不可撤销。
              </p>
            </div>
            <Form method="post" className="mt-5">
              <button
                type="submit"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
              >
                开始生成
              </button>
            </Form>
            {actionData && (
              <div
                className={`mt-4 p-4 rounded-md ${
                  actionData.success
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {actionData.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
