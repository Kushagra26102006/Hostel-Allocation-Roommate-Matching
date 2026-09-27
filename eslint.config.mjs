// @ts-check
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/storybook-static/**",
      "**/.storybook/**",
      "**/coverage/**",
      "**/*.d.ts",
    ],
  },
  // Source files — full type-aware linting
  {
    files: ["**/src/**/*.ts", "**/src/**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: true,
      },
    },
    plugins: {
      "@typescript-eslint": /** @type {any} */ (tseslint),
    },
    rules: {
      ...tseslint.configs["recommended"].rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],
    },
  },
  // Config / tooling files — no type-checking (they're not in any tsconfig project)
  {
    files: ["**/*.config.ts", "**/*.config.mjs", "**/*.config.cjs", "**/e2e/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        // no project here — type-aware rules disabled
      },
    },
    plugins: {
      "@typescript-eslint": /** @type {any} */ (tseslint),
    },
    rules: {
      ...tseslint.configs["recommended"].rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      // Disable rules that require type information
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },
  // Enforce repository boundary: direct use of models outside repository layer is prohibited
  {
    files: ["apps/**/*.ts", "apps/**/*.tsx", "packages/**/*.ts", "packages/**/*.tsx"],
    ignores: [
      "**/__tests__/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "apps/worker/**",
      "packages/db/src/repository/**",
      "packages/db/src/models/**",
      "packages/db/src/services/**",
      "packages/db/src/seed/**",
      "packages/db/src/seed.ts",
      "packages/db/src/index.ts",
      "packages/db/src/connection.ts",
      "packages/db/src/plugins/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@hostelhub/db",
              importNames: [
                "AllocationCycleModel",
                "ApplicationModel",
                "ApplicationDocumentModel",
                "BedModel",
                "BlockModel",
                "CompatibilityResponseModel",
                "ConsentRecordModel",
                "GroupModel",
                "HostelModel",
                "InstitutionModel",
                "PolicyRulesetModel",
                "PreferenceModel",
                "RoomModel",
                "UserModel",
                "AuditEntryModel",
                "AuditHeadModel",
              ],
              message:
                "Direct use of Mongoose models outside repositories is prohibited. Always access data via BaseRepository or domain-specific repositories.",
            },
          ],
          patterns: [
            {
              group: ["**/models/*", "@hostelhub/db/models/*", "**/models/*.js"],
              message:
                "Direct use of Mongoose models outside repositories is prohibited. Always access data via BaseRepository or domain-specific repositories.",
            },
          ],
        },
      ],
    },
  },
  prettier,
];

export default config;
