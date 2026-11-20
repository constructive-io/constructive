// The phases of the fast-app pipeline, as written to the pi session. Each mark
// is a custom entry `constructive.phase` with `{ phase, status, t }`; the
// timing report and the progress card both read them, so the names here are
// the contract.

import type { PipelinePhase, RenderCheckSummary } from './app-plan';

export const PHASE_ENTRY_TYPE = 'constructive.phase';

export const BACKEND_PHASES = [
  'provision',
  'schema',
  'codegen',
  'seed',
] as const satisfies readonly PipelinePhase[];
export const APP_PHASES = [
  'gen',
  'dev',
  'verify',
  'commit',
] as const satisfies readonly PipelinePhase[];

export type BackendPhase = (typeof BACKEND_PHASES)[number];

/** `approval` brackets the wait on the plan card, so a report can split it out. */
export type MarkPhase = PipelinePhase | 'approval';

export type PhaseMark = {
  phase: MarkPhase;
  status: 'start' | 'end';
  /** Epoch milliseconds. */
  t: number;
  /** On an end mark: false when the phase failed. */
  ok?: boolean;
  /** On a verify end mark: whether the pages were opened in a browser. */
  render?: RenderCheckSummary;
};

export const PIPELINE_PHASES: readonly PipelinePhase[] = [...BACKEND_PHASES, ...APP_PHASES];

export function isBackendPhase(phase: string): phase is BackendPhase {
  return (BACKEND_PHASES as readonly string[]).includes(phase);
}

export function isPhaseMark(value: unknown): value is PhaseMark {
  if (!value || typeof value !== 'object') return false;
  const mark = value as Record<string, unknown>;
  return (
    typeof mark.phase === 'string' &&
    (mark.status === 'start' || mark.status === 'end') &&
    typeof mark.t === 'number'
  );
}
