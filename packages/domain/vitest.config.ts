import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
      include: ["src/**/*.ts"],
      exclude: ["src/**/__tests__/**", "src/**/*.d.ts"],
    },
  },
});
