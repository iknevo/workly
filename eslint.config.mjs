import clerkNext from "@clerk/eslint-plugin/next";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "padding-line-between-statements": [
        "error",
        {
          blankLine: "always",
          prev: "directive",
          next: "*",
        },
        {
          blankLine: "any",
          prev: "directive",
          next: "directive",
        },
      ],
    },
  },
  {
    plugins: { "@clerk/next": clerkNext },
    rules: {
      "@clerk/next/require-auth-protection": [
        "error",
        {
          protected: [
            "src/app/**/studio/**",
            "src/app/**/subscriptions/**",
            "src/app/**/feed/subscribed/**",
            "src/app/**/playlists/**",
          ],
          public: ["src/app/sign-in/**", "src/app/sign-up/**", "src/actions/public/**"],
        },
      ],
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
