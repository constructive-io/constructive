#!/usr/bin/env node
/* eslint-disable no-console */
import { CLI, CLIOptions, getPackageJson } from 'inquirerer';

import { commands } from './cli/commands';

if (process.argv.includes('--version') || process.argv.includes('-v')) {
  const pkg = getPackageJson(__dirname);
  console.log(pkg.version);
  process.exit(0);
}

const options: Partial<CLIOptions> = {
  minimistOpts: {
    alias: {
      v: 'version',
      h: 'help'
    },
    boolean: ['skip-ast', 'no-color', 'color', 'help']
  }
};

const app = new CLI(commands, options);

app.run().catch((error) => {
  console.error(error);
  process.exit(1);
});
