import { defineConfig } from 'tsup';

export default defineConfig([
  // Main entry point (core + types + generators + client)
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['react', '@tanstack/react-query'],
    treeshake: true,
    splitting: false,
  },
  // React entry point (hooks, context)
  {
    entry: ['src/react/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    outDir: 'dist/react',
    external: ['react', '@tanstack/react-query'],
    treeshake: true,
    splitting: false,
  },
  // CLI entry point (separate build, no React deps)
  {
    entry: ['src/cli/index.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: true,
    outDir: 'dist/cli',
    external: ['react', '@tanstack/react-query'],
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
