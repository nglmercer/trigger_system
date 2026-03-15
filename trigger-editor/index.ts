/**
 * Trigger Editor - Bun Fullstack Server
 * 
 * Uses Bun's integrated dev server with HTML imports
 * Run with: bun run index.ts
 * Open: http://localhost:3000
 */

import { serve } from "bun";
import homepage from "./index.html";

const server = serve({
  // HTML routes - Bun automatically bundles <script> and <link> tags
  routes: {
    "/": homepage,
    "/index": homepage,

    // Health check
    "/api/health": Response.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      editor: "Trigger Editor Demo"
    })
  },

  // Development mode enables hot reloading and detailed errors
  development: {
    hmr: true,
    console: true
  },

  // API handler for dynamic routes
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // GET /api/rules
    if (pathname === "/api/rules" && req.method === "GET") {
      return Response.json([
        {
          id: "api-example-rule",
          name: "API Example Rule",
          on: "user.login",
          enabled: true,
          priority: 5,
          do: { type: "log", params: { message: "User logged in via API" } }
        }
      ]);
    }

    // POST /api/rules
    if (pathname === "/api/rules" && req.method === "POST") {
      const rule = await req.json();
      console.log("Created rule:", rule.id);
      return Response.json({ success: true, rule }, { status: 201 });
    }

    // GET /api/rules/:id
    const rulesMatch = pathname.match(/^\/api\/rules\/(.+)$/);
    if (rulesMatch && req.method === "GET") {
      const id = rulesMatch[1];
      return Response.json({
        id,
        name: "Example Rule",
        on: "user.login",
        do: { type: "log", params: { message: "Example" } }
      });
    }

    // DELETE /api/rules/:id
    if (rulesMatch && req.method === "DELETE") {
      const id = rulesMatch[1];
      console.log("Deleted rule:", id);
      return Response.json({ success: true });
    }

    return new Response("Not Found", { status: 404 });
  }
});
const serverUrl = `${server.hostname}:${server.port}`;
console.log(`Server running at: http://${serverUrl}`);
