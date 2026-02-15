import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, Plugin } from "vite";

// Detect if building for GitHub Pages (via environment variable)
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

// Custom plugin to modify HTML output for iOS WebView file:// compatibility
function iosWebViewPlugin(): Plugin {
  return {
    name: 'ios-webview-html',
    transformIndexHtml(html) {
      // Add version timestamp for debugging
      const version = `v${Date.now()}`;

      // Find the script tag and handle it
      const scriptMatch = html.match(/<script[^>]*src="[^"]*app\.js"[^>]*><\/script>/);

      if (scriptMatch) {
        // Remove script from wherever it is
        html = html.replace(scriptMatch[0], '');
        // Add script at end of body - use relative path for both builds
        const scriptSrc = isGitHubPages ? './app.js' : './app.js';
        html = html.replace('</body>', `<script src="${scriptSrc}"></script>\n<script>console.log("App version: ${version}");</script>\n</body>`);
      }

      // Add version meta tag
      html = html.replace('</head>', `<meta name="app-version" content="${version}" />\n</head>`);

      // Add dark class to html for Tailwind dark mode
      html = html.replace('<html lang="en">', '<html lang="en" class="dark">');

      return html;
    }
  };
}

const plugins = [react(), tailwindcss(), iosWebViewPlugin()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  base: "./",
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    assetsDir: ".",
    rollupOptions: {
      output: {
        // Use IIFE format instead of ES modules for file:// compatibility
        format: "iife",
        // Single bundle file
        inlineDynamicImports: true,
        entryFileNames: "app.js",
        assetFileNames: "[name][extname]",
      },
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
