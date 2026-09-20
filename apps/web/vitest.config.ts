import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [],
    env: {
      NODE_ENV: "test",
      MONGODB_URI: "mongodb://localhost:27017/hostelhub?replicaSet=rs0&directConnection=true",
      REDIS_URL: "redis://localhost:6379",
      S3_ENDPOINT: "http://localhost:9000",
      S3_ACCESS_KEY: "minioadmin",
      S3_SECRET_KEY: "minioadmin",
      S3_BUCKET: "hostelhub-docs",
      MASTER_ENCRYPTION_KEY: "test-master-key-that-is-32-chars!!",
      AUTH_SECRET: "test-auth-secret-that-is-32-chars!!",
      APP_URL: "http://localhost:3000",
    },
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
