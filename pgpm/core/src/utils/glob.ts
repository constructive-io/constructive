import { sync as globSync } from 'glob';
import path from 'path';

/**
 * Convert a native filesystem path to a posix-style path.
 * Windows path separators are not valid inside glob patterns.
 */
export const toPosixPath = (p: string): string => p.replace(/\\/g, '/');

/**
 * Join path segments into a glob pattern.
 *
 * `glob` treats `\` as an escape character on every platform, so a Windows
 * path produced by `path.join` silently matches nothing. Patterns must always
 * use forward slashes, which Windows accepts as a separator.
 */
export const globPattern = (...segments: string[]): string =>
  toPosixPath(path.join(...segments));

/**
 * Cross-platform `glob.sync` over path segments joined into a pattern.
 */
export const globPaths = (...segments: string[]): string[] =>
  globSync(globPattern(...segments));
