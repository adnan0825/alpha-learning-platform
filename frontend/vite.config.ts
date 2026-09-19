import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  /**
   * Where `/api` is forwarded in dev. Default is local Express — POST /api/* on
   * https://alpha.online currently hits static hosting (405), not the API, until nginx routes /api to Node.
   * Override: VITE_PROXY_API_TARGET=https://api.yourdomain.com
   */
  const proxyTarget = env.VITE_PROXY_API_TARGET || "http://127.0.0.1:3000";

  const apiProxy = {
    "/api": {
      target: proxyTarget,
      changeOrigin: true,
      secure: proxyTarget.startsWith("https"),
    },
    "/uploads": {
      target: proxyTarget,
      changeOrigin: true,
      secure: proxyTarget.startsWith("https"),
    },
  };

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: apiProxy,
    },
    preview: {
      port: 8080,
      proxy: apiProxy,
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime"],
    },
    build: {
      outDir: "dist",
    },
  };
});
