import { defineConfig } from "vitest/config";

// `npm run cases` – runs every example case (fixtures + cases-private) through the engine and prints a table.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["scripts/cases.runner.ts"],
    silent: false,
    reporters: ["dot"],
  },
});
