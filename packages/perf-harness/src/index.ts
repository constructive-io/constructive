#!/usr/bin/env node

export * from './fixture';
export * from './matrix';
export * from './process';
export * from './run';
export * from './types';

import { cliMain } from './run';

if (
  typeof require !== 'undefined' &&
  typeof module !== 'undefined' &&
  require.main === module
) {
  void cliMain().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  });
}
