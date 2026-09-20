import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 60000,
    hookTimeout: 60000,
  },
  resolve: {
    alias: {
      "@hostelhub/domain": path.resolve(
        __dirname,
        "../domain/src/index.ts",
      ),
      "@hostelhub/shared": path.resolve(
        __dirname,
        "../shared/src/index.ts",
      ),
    },
  },
});
