import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/main.ts'],
  format: 'esm',
  minify: true,
  sourcemap: true,
  clean: true,
});
