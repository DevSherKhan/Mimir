import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: "dashboard",
  build: {
    outDir: "../dist-dashboard",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
