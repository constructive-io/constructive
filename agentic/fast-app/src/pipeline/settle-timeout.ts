// What the schema step says when the API still doesn't show the schema after
// its 2-minute wait. It says what was seen: for a change this build's calls
// made, the database has it; for anything else the wait covered (a column the
// platform's schema records listed before the build, or one an earlier build
// left), only the records are known to have it. The API can serve a stale
// schema for many minutes, so neither tells the agent to wait and retry. A
// backend that is still starting fails the read itself, and the phase's own
// "not ready" fix covers that (progress.ts).
//
// Pure, and it imports only by relative path, so the pnpm test runner loads it.

import { expectationName, type SchemaExpectation } from './schema-settle';

const MADE_HERE_FIX =
  "The API schema may be stale, so waiting may not help. Tell the user the backend hasn't picked up the change. The database already has it: calling plan_app again later repeats no schema calls and finishes the build once the API shows it.";

const listed = (names: readonly string[]) =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

const pronoun = (names: readonly string[]) => (names.length > 1 ? 'them' : 'it');

/** The cause and the fix, from what the last `_meta` read still lacked; `madeHere` picks this build's own changes. */
export function settleTimeout(
  unmet: readonly SchemaExpectation[],
  madeHere: (expectation: SchemaExpectation) => boolean,
): { cause: string; fix: string } {
  const names = (own: boolean, present: boolean) =>
    unmet.filter((e) => madeHere(e) === own && e.present === present).map(expectationName);
  const line = (found: string[], text: (list: string, them: string) => string) =>
    found.length ? [text(listed(found), pronoun(found))] : [];
  const cause = [
    ...line(
      names(true, true),
      (n, it) => `The database has ${n}, but the API does not list ${it} after 2 minutes.`,
    ),
    ...line(
      names(true, false),
      (n, it) => `The database no longer has ${n}, but the API still lists ${it} after 2 minutes.`,
    ),
    ...line(
      names(false, true),
      (n, it) =>
        `The platform's schema records list ${n}, but the API does not show ${it} after 2 minutes.`,
    ),
    ...line(
      names(false, false),
      (n, it) =>
        `The platform's schema records no longer list ${n}, but the API still shows ${it} after 2 minutes.`,
    ),
  ].join(' ');
  if (unmet.every(madeHere)) return { cause, fix: MADE_HERE_FIX };
  const all = unmet.map(expectationName);
  return {
    cause,
    fix: `The API schema may be stale, so waiting may not help. Tell the user the backend hasn't picked up ${listed(all)} yet; calling plan_app again later repeats no schema calls and finishes the build once the API shows ${pronoun(all)}.`,
  };
}
