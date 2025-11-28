import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  platform: "browser",
  noExternal: ["crypto-js"],
  tsconfig: "./tsconfig.json",
});

