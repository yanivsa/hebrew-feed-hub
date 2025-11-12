import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const devServerPort = Number(process.env.VITE_DEV_PORT ?? process.env.PORT ?? 5173);
const devServerHost = process.env.VITE_DEV_HOST ?? "0.0.0.0";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: devServerHost,
    port: Number.isFinite(devServerPort) ? devServerPort : 5173,
  },
  build: {
    chunkSizeWarningLimit: 700,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
