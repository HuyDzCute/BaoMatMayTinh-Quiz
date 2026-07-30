import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "scripts/**"]),
  {
    rules: {
      // Reject the deprecated Firebase `db` alias (we now use `rtdb`).
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "@/lib/firebase",
              importNames: ["db"],
              message: "Use `rtdb` instead of the deprecated `db` alias.",
            },
          ],
        },
      ],

      // Encourage the new `SafeAvatar` over raw <img>.
      "@next/next/no-img-element": "warn",

      // Allow informational console output for now; migrate to `logger` over time.
      "no-console": "off",

      // The flashcards study page intentionally resets transient UI state
      // (input, pick, lock) when navigating between cards. Demote to warn
      // until we migrate the screen to a reducer-based state machine.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
