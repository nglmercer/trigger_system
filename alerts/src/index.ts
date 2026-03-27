import { serve } from "bun";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const distDir = join(import.meta.dir, "..", "dist");

const server = serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    let filePath = url.pathname;

    if (filePath === "/") {
      filePath = "/index.html";
    }

    const fullPath = join(distDir, filePath);

    if (existsSync(fullPath)) {
      const ext = filePath.split(".").pop();
      const contentType = {
        "html": "text/html",
        "js": "application/javascript",
        "css": "text/css",
        "json": "application/json",
        "svg": "image/svg+xml",
        "map": "application/json",
      }[ext || ""] || "text/plain";

      return new Response(readFileSync(fullPath), {
        headers: { "Content-Type": contentType },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🚀 Alert Editor running at ${server.url}`);
