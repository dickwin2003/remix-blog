# Blog Demo: Remix + Cloudflare D1

**Note**: 🧪 This is a example application and is not officially supported by Cloudflare.

An example app that shows how to query [Cloudflare D1](https://developers.cloudflare.com/d1/) from a [Remix](https://remix.run/) [`loader`](https://remix.run/docs/en/main/guides/data-loading) function.

See the official D1 documentation's [Remix + D1 example](https://developers.cloudflare.com/d1/examples/d1-and-remix/) for code-based example of how to define a `LoaderFunction`.

Config the file in wrangel.toml
eg:
binding = "DB"
database_name = "remix-blog"
database_id = "xxxx"
preview_database_id = "DB" # Required for Pages local development

[vars]
TINYMCE_API_KEY = "xxx"

Deploy this website in cloudflare  as :https://remix-blog-ee4.pages.dev

## License

Copyright Cloudflare, Inc (2023). Apache-2.0 licensed. See the LICENSE file for details.
