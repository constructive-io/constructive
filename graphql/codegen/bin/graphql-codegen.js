#!/usr/bin/env node

// This is the CLI entry point that loads the built CLI module
import('../dist/cli/index.js').catch((err) => {
  console.error('Failed to load graphql-codegen CLI:', err.message);
  console.error('Make sure to run "pnpm build" first.');
  process.exit(1);
});
