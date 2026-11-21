import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigEnvylabs from "eslint-config-envylabs";
import { configs as tseslintConfigs } from "typescript-eslint";

export default defineConfig(
  eslint.configs.recommended,
  ...eslintConfigEnvylabs.full,
  tseslintConfigs.strictTypeChecked,
  tseslintConfigs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  globalIgnores(["dist/", "test/fixtures/**/*.js"]),
);
