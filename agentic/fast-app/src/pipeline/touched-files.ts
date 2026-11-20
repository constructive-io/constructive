// What a commit of the app may include besides the app itself: the project
// files the agent wrote or edited with its file tools in this session. A
// commit never stages the whole project, which would sweep in whatever else
// sits in it.

import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * The app, the spec the desktop rendered, its last look at the database, and
 * the build record: always part of the app's commits. The project files are
 * named, so a stray file the agent's shell leaves in `.constructive` (a
 * `sed -i` backup) stays out.
 */
export const APP_PATHS = [
  'packages/app',
  '.constructive/app-spec.json',
  '.constructive/view.json',
  '.constructive/build.json',
];

type Entry = {
  type?: string;
  message?: { role?: string; content?: unknown };
};

type ToolCall = { type?: string; name?: string; arguments?: { path?: unknown } };

/** Project-relative files the session's write and edit calls touched, outside APP_PATHS. */
export function touchedFiles(entries: readonly unknown[], cwd: string): string[] {
  const root = path.resolve(cwd);
  const files = new Set<string>();
  for (const raw of entries) {
    const entry = raw as Entry;
    if (entry.type !== 'message' || entry.message?.role !== 'assistant') continue;
    const content = entry.message.content;
    if (!Array.isArray(content)) continue;
    for (const block of content as ToolCall[]) {
      if (block.type !== 'toolCall' || (block.name !== 'write' && block.name !== 'edit')) continue;
      const target = block.arguments?.path;
      if (typeof target !== 'string' || !target) continue;
      const file = path.resolve(root, target);
      const rel = path.relative(root, file);
      if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) continue;
      const posix = rel.split(path.sep).join('/');
      if (APP_PATHS.some((p) => posix === p || posix.startsWith(`${p}/`))) continue;
      if (existsSync(file)) files.add(posix);
    }
  }
  return [...files].sort();
}
