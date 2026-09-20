import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 60000,
    hookTimeout: 60000,
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
  },
  resolve: {
    alias: {
      "@hostelhub/domain": path.resolve(__dirname, "../domain/src/index.ts"),
      "@hostelhub/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
});
