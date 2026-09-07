#!/usr/bin/env node

import { cliMain } from './run';

void cliMain().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exitCode = 1;
});
