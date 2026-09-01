/**
 * Synchronous process execution with an argv array instead of a command string.
 *
 * `execFileSync` would do, except that on Windows `npm`/`npx` are `.cmd` shims
 * and those cannot be spawned without a shell (CVE-2024-27980 made it EINVAL),
 * while `shell: true` concatenates argv back into one shell string. `cross-spawn`
 * runs them through `cmd.exe` with each argument escaped individually, so a value
 * containing a space or a shell metacharacter stays a single argument on both
 * platforms.
 */
import type { SpawnSyncOptions, SpawnSyncReturns } from 'child_process';
import spawn from 'cross-spawn';

export const spawnSyncChecked = (
  file: string,
  args: string[],
  options: SpawnSyncOptions = {}
): SpawnSyncReturns<string | Buffer> => {
  const result = spawn.sync(file, args, options);
  if (result.error) throw result.error;
  if (result.signal) {
    throw new Error(`${file} was terminated by signal ${result.signal}`);
  }
  if (result.status !== 0) {
    const stderr = result.stderr ? String(result.stderr) : '';
    throw new Error(
      `${file} exited with code ${result.status}${stderr ? `: ${stderr}` : ''}`
    );
  }
  return result;
};

/** Run a command and return its stdout, trimmed. */
export const spawnSyncOutput = (
  file: string,
  args: string[],
  options: SpawnSyncOptions = {}
): string =>
  String(
    spawnSyncChecked(file, args, {
      ...options,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).stdout ?? ''
  ).trim();
