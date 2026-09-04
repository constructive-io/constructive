#!/usr/bin/env node

export * from './fixture';
export * from './metrics';
export * from './process';
export * from './report';
export * from './run';
export * from './schedule';
export * from './types';

import { cliMain } from './run';

if (require.main === module) {
  void cliMain().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  });
}
