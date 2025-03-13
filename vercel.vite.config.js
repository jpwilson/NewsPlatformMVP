import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// This is a specialized config for Vercel builds
export default defineConfig({
  plugins: [
    // Custom plugin to handle zod resolution
    {
      name: 'resolve-zod-module',
      resolveId(source, importer) {
        // Handle both direct zod imports and our fallback
        if (source === 'zod') {
          return path.resolve(__dirname, 'node_modules/zod/lib/index.js');
        }
        if (source === '../zod-fallback' || source === '../zod-fallback.ts') {
          // Redirect to our fallback module
          return path.resolve(__dirname, 'client/src/zod-fallback.ts');
        }
        return null;
      }
    },
    react()
  ],
  define: {
    // Force replacement of process.env.NODE_ENV with 'production'
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      // Explicitly alias zod to its node_modules path
      "zod": path.resolve(__dirname, "node_modules/zod")
    }
  },
  optimizeDeps: {
    include: ['zod'],
    force: true, // Force include dependencies
    esbuildOptions: {
      // Configure esbuild to properly handle zod
      mainFields: ['module', 'main'],
      resolveExtensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      // Don't externalize any dependencies for Vercel build
      external: [],
      input: {
        main: path.resolve(__dirname, "client/index.html"),
        authCallback: path.resolve(__dirname, "client/auth-callback.html"),
      },
    },
  },
}); 