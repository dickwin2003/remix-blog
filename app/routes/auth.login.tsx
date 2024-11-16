import { json, redirect, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData } from "@remix-run/react";
import bcrypt from "bcryptjs";
import AuthLayout from "~/components/AuthLayout";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database };
  const formData = await request.formData();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return json(
      { error: "用户名和密码不能为空" },
      { status: 400 }
    );
  }

  const user = await env.DB.prepare(
    "SELECT * FROM t_user WHERE username = ?"
  ).bind(username).first();

  if (!user) {
    return json(
      { error: "用户名或密码错误" },
      { status: 401 }
    );
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return json(
      { error: "用户名或密码错误" },
      { status: 401 }
    );
  }

  // Record login event
  await env.DB.prepare(
    "INSERT INTO t_event (username, ip_address, event_type) VALUES (?, ?, ?)"
  ).bind(username, request.headers.get("CF-Connecting-IP") || "unknown", "login").run();

  // Update last login time
  await env.DB.prepare(
    "UPDATE t_user SET last_login = unixepoch() WHERE username = ?"
  ).bind(username).run();

  return redirect("/admin", {
    headers: {
      "Set-Cookie": `user=${username}; Path=/; HttpOnly; SameSite=Lax;`,
    },
  });
}

export default function Login() {
  const actionData = useActionData<typeof action>();

  return (
    <AuthLayout>
      <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            登录管理后台
          </h2>
        </div>
        <Form method="post" className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="用户名"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="密码"
              />
            </div>
          </div>

          {actionData?.error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {actionData.error}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              登录
            </button>
          </div>
        </Form>
      </div>
    </AuthLayout>
  );
}
