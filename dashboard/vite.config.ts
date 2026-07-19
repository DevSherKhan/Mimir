import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/dashboard/",
  plugins: [react(), tailwindcss()],
  root: "dashboard",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "../dist-dashboard",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
