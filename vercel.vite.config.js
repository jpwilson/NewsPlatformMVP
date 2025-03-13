import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// This is a specialized config for Vercel builds
export default defineConfig({
  plugins: [react()],
  define: {
    // Force replacement of process.env.NODE_ENV with 'production'
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    }
  },
  optimizeDeps: {
    include: ['zod'],
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
      // Force zod to be included in the bundle
      external: [], 
      input: {
        main: path.resolve(__dirname, "client/index.html"),
        authCallback: path.resolve(__dirname, "client/auth-callback.html"),
      },
    },
  },
}); 