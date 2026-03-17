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
    console.log("pathname",pathname)
    return new Response("Not Found", { status: 404 });
  }
});
const serverUrl = `${server.hostname}:${server.port}`;
console.log(`Server running at: http://${serverUrl}`);
