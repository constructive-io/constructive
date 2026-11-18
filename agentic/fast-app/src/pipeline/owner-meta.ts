// The owner's read of `_meta` after the schema step, which waits for the API
// to catch up with the database: codegen and the seed both read that schema.

import { fetchLiveMeta, type LiveMetaTable } from '../extensions/db-tools/live-meta';
import type { OwnerSession } from './host';
import { PhaseError } from './progress';
import {
  type SchemaExpectation,
  unmetExpectations,
  unmetSchema,
  waitForMeta,
} from './schema-settle';
import { settleTimeout } from './settle-timeout';
import { retryTransientOnce } from './transient';

/**
 * Polls the owner's `_meta` until it meets `expected`, failing the schema
 * phase after 2 min; `madeHere` picks the changes this build's calls made.
 */
export async function settleOwnerMeta(
  session: OwnerSession,
  expected: readonly SchemaExpectation[],
  madeHere: (expectation: SchemaExpectation) => boolean,
  note: (text: string) => void,
  signal?: AbortSignal,
): Promise<LiveMetaTable[]> {
  const { tables, missing } = await waitForMeta({
    fetch: () =>
      retryTransientOnce(() => fetchLiveMeta(session.endpoint, session.token), { note, signal }),
    lacking: (live) => {
      const unmet = unmetSchema(live, expected);
      return unmet.length ? unmet.join(', ') : null;
    },
    note,
    signal,
  });
  if (missing) {
    const { cause, fix } = settleTimeout(unmetExpectations(tables, expected), madeHere);
    throw new PhaseError('schema', cause, fix);
  }
  return tables;
}
