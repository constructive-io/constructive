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
    alias: { v: 'version', h: 'help' },
    boolean: ['skip-ast', 'color', 'help', 'version'],
    string: [
      'connection',
      'host',
      'user',
      'password',
      'database',
      'schemas',
      'exclude-schemas',
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
