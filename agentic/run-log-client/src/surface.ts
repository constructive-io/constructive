/**
 * Telling "this database has no run surface" apart from "the read failed".
 *
 * A database whose agent module was provisioned without `has_runs` has no
 * `agent_run`/`agent_event` at all, so the schema rejects the query outright
 * rather than returning zero rows. That is a configuration fact about the
 * database, not a failure of the read, and a raw GraphQL validation dump is a
 * poor way to tell an operator so. The error is still an error — it is only
 * classified here, never swallowed.
 */

import type { RunLogNames } from './names';

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Matched on the validation messages the tenant API returns, because the absence
 * of the tables is only observable through the schema: the run collection is not
 * a field and the run filter is not a type.
 */
export function isMissingRunSurface(
  error: unknown,
  names: RunLogNames
): boolean {
  const message = messageOf(error);
  return (
    message.includes(`Cannot query field "${names.runs}"`) ||
    message.includes(`Unknown type "${names.runType}Filter"`)
  );
}
