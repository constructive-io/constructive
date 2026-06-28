#!/usr/bin/env ts-node
import { commands } from './commands';

commands(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
