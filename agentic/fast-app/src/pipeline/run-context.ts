// What every phase of one plan_app build reads (pipeline.ts makes it). A
// phase takes the run and the step's note, and returns only what a later
// phase needs.

import type { AppSpec } from '../app-spec';
import type { FieldRules } from '../extensions/db-tools/live-meta-index';
import type { BuildPlan, ResolvedPlan } from './build-plan';
import type { FastAppServices, OwnerCredential } from './host';
import type { BuildProgress } from './progress';

export type { Note } from './host';

export type RunContext = {
  cwd: string;
  /** The spec the build applies and saves (`resolved.spec`). */
  spec: AppSpec;
  plan: BuildPlan;
  resolved: ResolvedPlan;
  projectId: string | undefined;
  services: FastAppServices;
  /** What the card's answer carried for the owner's sign-in to the app's database. */
  credential: OwnerCredential;
  /** The user's stop, or a failed step ending the step that runs beside it. */
  signal: AbortSignal;
  /** When the build started, as the record keeps it. */
  startedAt: string;
  /** The spec's field rules, which the seed and verify follow. */
  rules: FieldRules;
  /** What a phase adds to the card: the database's name, and values the step logs hide. */
  card: Pick<BuildProgress, 'set' | 'addSecrets'>;
};

/** What a db-tools call takes of the run: the project and the stop. */
export const toolCtx = (run: RunContext) => ({ cwd: run.cwd, signal: run.signal });
