import "dotenv/config";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // グラフ部品の描画テストはJSXを書くため .tsx も対象にする
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
