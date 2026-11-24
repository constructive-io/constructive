// The tables of the database's entity types (a data room, a team): each is
// the main table of a membership scope, and a row there comes with the
// memberships, buckets, limits and jobs the backend makes and tears down. The
// CRUD smoke only reads them. The modules API lists them for any blueprint,
// curated or custom, so nothing here knows a blueprint by name.

import { requireProjectContext } from './project-env';
import { retryTransientOnce } from './transient';

/**
 * The SQL names of the entity types' tables. A failed read throws: a smoke
 * that took one of them for an app table would write a row there, which the
 * backend gives memberships and a bucket that the smoke can't remove.
 */
export async function entityTableNames(cwd: string, signal?: AbortSignal): Promise<string[]> {
  const context = await requireProjectContext(cwd, 'the project has no database binding');
  const res = await retryTransientOnce(
    () =>
      context.modules.entityTypeProvision
        .findMany({
          where: { databaseId: { equalTo: context.databaseId } },
          select: { outEntityTableName: true },
        })
        .unwrap(),
    { note: (text) => console.warn(`[fast-app] entity types: ${text}`), signal },
  );
  return (res.entityTypeProvisions?.nodes ?? []).flatMap((node) =>
    typeof node.outEntityTableName === 'string' && node.outEntityTableName
      ? [node.outEntityTableName]
      : [],
  );
}
