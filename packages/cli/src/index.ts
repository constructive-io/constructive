#!/usr/bin/env node
import { findAndRequirePackageJson } from 'find-and-require-package-json';
import { CLI, CLIOptions } from 'inquirerer';

import { commands } from './commands';

if (process.argv.includes('--version') || process.argv.includes('-v')) {
  const pkg = findAndRequirePackageJson(__dirname);

  console.log(pkg.version);
  process.exit(0);
}

export const options: Partial<CLIOptions> = {
  minimistOpts: {
    alias: {
      v: 'version',
      h: 'help'
    }
  }
};

const app = new CLI(commands, options);

app.run().then(()=> {
  // all done!
}).catch(error => {
  // Should not reach here with the new CLI error handling pattern
  // But keep as fallback for unexpected errors
  console.error('Unexpected error:', error);
  process.exit(1);
});
