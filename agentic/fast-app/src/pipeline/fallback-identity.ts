import { simpleGit } from 'simple-git';

const FALLBACK_GIT_NAME = 'Constructive Desktop';
const FALLBACK_GIT_EMAIL = 'constructive@localhost';

async function readConfig(cwd: string, key: string): Promise<string | null> {
  try {
    const value = (await simpleGit(cwd).raw(['config', '--get', key])).trim();
    return value || null;
  } catch {
    return null;
  }
}

/**
 * `-c` arguments that give one commit an author when git has none configured,
 * so a commit the app makes on its own succeeds on a machine without a global
 * git identity. Empty when one is configured.
 */
export async function fallbackIdentityArgs(cwd: string): Promise<string[]> {
  const args: string[] = [];
  if (!(await readConfig(cwd, 'user.name'))) args.push('-c', `user.name=${FALLBACK_GIT_NAME}`);
  if (!(await readConfig(cwd, 'user.email'))) args.push('-c', `user.email=${FALLBACK_GIT_EMAIL}`);
  return args;
}
