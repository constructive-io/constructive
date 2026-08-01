#!/usr/bin/env node
import { Logger } from '@pgpmjs/logger';
import { CLI, CLIOptions, getPackageJson } from 'inquirerer';

import { commands } from './cli/commands';

const log = new Logger('safegres');

if (process.argv.includes('--version') || process.argv.includes('-v')) {
  const pkg = getPackageJson(__dirname);
  process.stdout.write(`${pkg.version}\n`);
  process.exit(0);
}

const options: Partial<CLIOptions> = {
  minimistOpts: {
    alias: { v: 'version', h: 'help', q: 'summary' },
    boolean: ['skip-ast', 'color', 'help', 'version', 'summary', 'verbose', 'call-graph', 'fail-on-new-boundaries'],
    string: [
      'baseline',
      'write-baseline',
      'compare',
      'compare-ref',
      'write-snapshot',
      'connection',
      'host',
      'user',
      'password',
      'database',
      'schemas',
      'exclude-schemas',
      'ignore-extensions',
      'roles',
      'exclude-roles',
      'format',
      'fail-on'
    ]
  }
};

new CLI(commands, options).run().catch((error) => {
  log.error(error);
  process.exit(1);
});
