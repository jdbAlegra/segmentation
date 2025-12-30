import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Allow overriding the base path so the app works when served from
// GitHub Pages under /<repo>/.
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
