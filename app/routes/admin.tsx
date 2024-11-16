import { json, redirect, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Outlet, useLoaderData } from "@remix-run/react";
import AdminLayout from "~/components/AdminLayout";

export async function loader({ request }: LoaderFunctionArgs) {
  const cookie = request.headers.get("Cookie");
  const userCookie = cookie?.split(";")
    .find((c) => c.trim().startsWith("user="))
    ?.split("=")[1];

  if (!userCookie) {
    return redirect("/auth/login");
  }

  return json({ username: userCookie });
}

export default function Admin() {
  const { username } = useLoaderData<typeof loader>();

  return (
    <AdminLayout username={username}>
      <Outlet />
    </AdminLayout>
  );
}
