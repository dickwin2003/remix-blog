import { redirect, type ActionFunctionArgs } from "@remix-run/cloudflare";

export async function action({ request, context }: ActionFunctionArgs) {
  return redirect("/");
}

export default function Logout() {
  throw redirect("/");
}
