/**
 * CLI entry point for running the generated CLI application.
 *
 * Creates an inquirerer CLI instance with the generated command map,
 * handles --version and --tty flags, and runs the CLI.
 *
 * NOTE: This file is read at codegen time and written to output.
 * Any changes here will affect all generated CLI entry points.
 */

import { CLI, CLIOptions, getPackageJson } from 'inquirerer';
import { commands } from './commands';

if (process.argv.includes('--version') || process.argv.includes('-v')) {
  const pkg = getPackageJson(__dirname);
  console.log(pkg.version);
  process.exit(0);
}

// Check for --tty false to enable non-interactive mode (noTty)
const ttyIdx = process.argv.indexOf('--tty');
const noTty = ttyIdx !== -1 && process.argv[ttyIdx + 1] === 'false';

const options: Partial<CLIOptions> = {
  noTty,
  minimistOpts: { alias: { v: 'version', h: 'help' } },
};

const app = new CLI(commands, options);
app.run().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
