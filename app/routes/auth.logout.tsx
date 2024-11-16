import { redirect, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { redirect as redirectClient } from "@remix-run/react";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database };
  const cookie = request.headers.get("Cookie");
  const userCookie = cookie?.split(";")
    .find((c) => c.trim().startsWith("user="))
    ?.split("=")[1];

  // 不再记录登出事件，因为event_type不支持'logout'类型
  // 如果需要记录登出事件，需要先修改数据库表的约束

  return redirect("../", {
    headers: {
      "Set-Cookie": "user=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    },
  });
}

export default function Logout() {
  throw redirectClient("../..");
}
