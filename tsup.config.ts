import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/types/index.ts", "src/operators/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  clean: true,
});
