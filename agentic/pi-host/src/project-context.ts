// The cwd decision, made explicit.
//
// `@agentic-kit/pi`'s control-plane tools resolve their tenant through
// `resolveProjectContext(cwd)`, which reads database binding metadata from
// `<cwd>/.env` and authenticates through the host. The coding lane never
// establishes project context in its git clone.
//
// It is still legitimate to want both lanes in one run (edit the repo *and*
// change the schema), so the context is materialized in a directory beside the
// clone and handed to the tools as their cwd. This module owns that directory
// and refuses to create it anywhere inside the work tree.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface ProjectContextRequest {
  /** Where the `.env` is written. Must be outside `workTree`. */
  dir: string;
  /** The git clone the agent edits. */
  workTree: string;
  databaseId: string;
  /** Written as `DATABASE_NAME`, which the record tools need. */
  databaseName?: string;
}

export class ProjectContextInsideWorkTreeError extends Error {
  constructor(
    readonly dir: string,
    readonly workTree: string
  ) {
    super(
      `refusing to write project binding to ${dir}: it is inside the work tree ${workTree}`
    );
    this.name = 'ProjectContextInsideWorkTreeError';
  }
}

/** True when `child` is `parent` or sits beneath it. */
export function isInside(parent: string, child: string): boolean {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * Materialize a pi project context outside the work tree and return its
 * directory, which is what the control-plane tools take as their cwd.
 */
export async function materializeProjectContext(
  request: ProjectContextRequest
): Promise<string> {
  if (isInside(request.workTree, request.dir)) {
    throw new ProjectContextInsideWorkTreeError(request.dir, request.workTree);
  }
  if (!request.databaseId) {
    throw new Error('a project context needs DATABASE_ID');
  }

  await mkdir(request.dir, { recursive: true, mode: 0o700 });
  const lines = [
    `DATABASE_ID=${request.databaseId}`,
    ...(request.databaseName ? [`DATABASE_NAME=${request.databaseName}`] : [])
  ];
  await writeFile(path.join(request.dir, '.env'), `${lines.join('\n')}\n`, { mode: 0o600 });
  return request.dir;
}
