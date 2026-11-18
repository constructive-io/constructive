// TEMPORARY partial copy for the headless host, until the pipeline port lands
// on feat/agentic-fast-app. It holds only what the headless host imports, as
// the desktop's src/main/fast-app/progress.ts has it. The port's full file
// replaces it.

import type { AppBuildDetails, AppBuildFailure, PhaseName } from './app-plan';
import type { PhaseMark } from './phases';

export type PhaseReporter = {
  /** Appends a `constructive.phase` entry to the pi session. */
  mark(mark: PhaseMark): void;
  /** Streams the current details to the tool card. */
  update(details: AppBuildDetails): void;
};

// A failure the model can act on: the phase, what went wrong, what to change.
// Plain fields, not parameter properties, so node --test can strip the types.
export class PhaseError extends Error {
  readonly phase: PhaseName;
  readonly cause: string;
  readonly fix: string;
  readonly checks?: AppBuildDetails['checks'];

  constructor(phase: PhaseName, cause: string, fix: string, checks?: AppBuildDetails['checks']) {
    super(`${phase}: ${cause}`);
    this.phase = phase;
    this.cause = cause;
    this.fix = fix;
    this.checks = checks;
  }

  toFailure(): AppBuildFailure {
    return {
      phase: this.phase,
      cause: this.cause,
      summary: this.cause.split('\n')[0],
      fix: this.fix
    };
  }
}

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : String(err ?? 'failed');
