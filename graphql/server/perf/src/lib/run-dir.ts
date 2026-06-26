import fs from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_TMP_ROOT = '/tmp/constructive-perf';

export function toIsoFileTime(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function makeRunId(prefix = 'graphile-cache-perf'): string {
  return `${prefix}-${toIsoFileTime(new Date())}-pid${process.pid}`;
}

export function defaultRunDir(prefix = 'graphile-cache-perf'): string {
  return path.join(DEFAULT_TMP_ROOT, makeRunId(prefix));
}

export async function ensureRunDirs(runDir: string): Promise<{
  runDir: string;
  dataDir: string;
  logsDir: string;
  reportsDir: string;
  tmpScriptsDir: string;
}> {
  const dirs = {
    runDir,
    dataDir: path.join(runDir, 'data'),
    logsDir: path.join(runDir, 'logs'),
    reportsDir: path.join(runDir, 'reports'),
    tmpScriptsDir: path.join(runDir, 'tmp-scripts'),
  };
  await Promise.all(Object.values(dirs).map((dir) => fs.mkdir(dir, { recursive: true })));
  return dirs;
}

export async function writeJson(filePath: string, payload: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
