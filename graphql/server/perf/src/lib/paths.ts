import path from 'node:path';
import type { PerfPaths } from '../types';

export function getPerfPaths(): PerfPaths {
  const perfSrcDir = __dirname.endsWith(`${path.sep}lib`)
    ? path.resolve(__dirname, '..')
    : path.resolve(__dirname);
  const perfDir = path.resolve(perfSrcDir, '..');
  const serverDir = path.resolve(perfDir, '..');
  const repoRoot = path.resolve(serverDir, '..', '..');
  return { repoRoot, serverDir, perfDir };
}
