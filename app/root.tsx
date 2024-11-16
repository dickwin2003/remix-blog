import { cssBundleHref } from "@remix-run/css-bundle";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import styles from "./tailwind.css";
import { json } from "@remix-run/cloudflare";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: "https://rsms.me/inter/inter.css" },
  { rel: "stylesheet", href: "/tinymce/skins/ui/oxide/skin.min.css" },
  { rel: "stylesheet", href: "/tinymce/skins/ui/oxide/content.min.css" },
  { rel: "stylesheet", href: "/tinymce/skins/content/default/content.min.css" }
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  return json({
    env: {
      TINYMCE_API_KEY: context.env.TINYMCE_API_KEY,
    },
  });
}

function App() {
  const { env } = useLoaderData<typeof loader>();

  return (
    <html lang="zh-CN" className="h-full bg-gray-100">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script src="/tinymce/tinymce.min.js" async></script>
        <style>{`
          .ProseMirror {
            min-height: 300px;
            padding: 1rem;
            border-radius: 0.375rem;
            border: 1px solid #e5e7eb;
            outline: none;
          }
          .ProseMirror:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
          .ProseMirror p {
            margin: 1em 0;
          }
          .ProseMirror > *:first-child {
            margin-top: 0;
          }
          .ProseMirror > *:last-child {
            margin-bottom: 0;
          }
          .ProseMirror ul,
          .ProseMirror ol {
            padding: 0 1rem;
          }
          .ProseMirror h1 {
            font-size: 2em;
            font-weight: bold;
          }
          .ProseMirror h2 {
            font-size: 1.5em;
            font-weight: bold;
          }
          .ProseMirror blockquote {
            border-left: 3px solid #e5e7eb;
            padding-left: 1rem;
            color: #6b7280;
          }
          .ProseMirror hr {
            border: none;
            border-top: 2px solid #e5e7eb;
            margin: 2rem 0;
          }
          .ProseMirror img {
            max-width: 100%;
            height: auto;
          }
          .ProseMirror a {
            color: #3b82f6;
            text-decoration: underline;
          }
        `}</style>
      </head>
      <body className="h-full">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

export { App as default }
