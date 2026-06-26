import { spawn } from 'node:child_process';
import type { RunProcessOptions } from '../types';

const SHELL_CHARS = /[^A-Za-z0-9_/:=.,@%+-]/;

export function shellQuote(value: string): string {
  if (value.length > 0 && !SHELL_CHARS.test(value)) return value;
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export function formatCommand(command: string, args: string[]): string {
  return [command, ...args].map(shellQuote).join(' ');
}

export async function runProcess(
  command: string,
  args: string[],
  options: RunProcessOptions,
): Promise<void> {
  const label = options.label ? `[${options.label}] ` : '';
  console.log(`${label}${formatCommand(command, args)}`);

  if (options.dryRun) return;

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${formatCommand(command, args)} failed with code=${code} signal=${signal ?? ''}`));
    });
  });
}
