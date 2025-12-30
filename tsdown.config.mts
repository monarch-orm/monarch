import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/types/index.ts", "src/operators/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
});
