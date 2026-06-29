import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";

export default [
  {
    ignores: ["dist/**", "build/**", "node_modules/**", "*.js"],
  },
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
        React: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      "unused-imports": unusedImports,
      "react-refresh": reactRefresh,
      "react-hooks": reactHooks,
    },
    rules: {
      // Automatically remove unused imports
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "none",
          argsIgnorePattern: "^_",
        },
      ],
      // Detect dead code - disable base rule, let unused-imports handle it
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
      "no-unreachable": "warn",
      "no-unused-expressions": "warn",
      "no-useless-escape": "warn",

      // React specific
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      ...reactHooks.configs.recommended.rules,

      // TypeScript strict rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-expressions": "error",

      // Code quality - allow console in server code
      "no-console": "off",
      "prefer-const": "error",
      "no-var": "error",
    },
  },
];
