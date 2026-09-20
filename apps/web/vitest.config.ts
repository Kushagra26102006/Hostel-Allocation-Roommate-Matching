import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"],
    server: {
      deps: {
        inline: ["next-auth"],
      },
    },
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: /^next\/server$/, replacement: require.resolve("next/server") },
      {
        find: "@hostelhub/domain",
        replacement: path.resolve(__dirname, "../../packages/domain/src/index.ts"),
      },
      {
        find: "@hostelhub/shared",
        replacement: path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      },
    ],
  },
});
