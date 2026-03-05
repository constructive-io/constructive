#!/usr/bin/env node
import { CLI, CLIOptions, getPackageJson } from 'inquirerer';

import { commands } from './cli-commands';

if (process.argv.includes('--version') || process.argv.includes('-v')) {
  const pkg = getPackageJson(__dirname);
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

app.run().then(() => {
  // all done!
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
