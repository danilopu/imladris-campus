import { defineConfig } from 'vite';

// base:'./' makes the build portable (works from any subpath / file host)
export default defineConfig({
  base: './',
  build: { target: 'es2020', sourcemap: true }
});
