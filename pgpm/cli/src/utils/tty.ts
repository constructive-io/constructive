/**
 * Determine whether the CLI should run in non-interactive (noTty) mode from
 * parsed argv and the environment. Minimist parses `--no-tty` as `tty: false`.
 */
export const isNoTtyRequested = (argv: Partial<Record<string, any>>): boolean =>
  Boolean(
    argv.noTty ||
    argv['no-tty'] ||
    argv.tty === false ||
    process.env.CI === 'true'
  );

/**
 * Detect noTty mode from raw process argv, before minimist parsing. Used at
 * CLI construction time so the shared prompter itself is non-interactive.
 */
export const detectNoTtyFromProcess = (argv: string[] = process.argv): boolean =>
  argv.includes('--no-tty') ||
  argv.includes('--noTty') ||
  process.env.CI === 'true';
