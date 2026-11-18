// TEMPORARY partial copy for the headless host, until the pipeline port lands
// on feat/agentic-fast-app. It holds only the build modes and `rebuildOf`, as
// the desktop's src/main/fast-app/build-plan.ts has them, with the plan's
// other fields left out. The port's full file replaces it.

import type { EntityTypeSnapshot } from '../app-spec/schema-drift';
import type { AppSpec } from '../app-spec/types';

/**
 * Which build this is; every step that differs by it reads it.
 * - `rebuild`: the database is gone (reprovision.ts); provision makes
 *   `databaseName` in place of `replaces`, only while that one is still bound.
 */
export type BuildMode =
  | { kind: 'first' }
  | { kind: 'first-again' | 'follow-up'; prev: AppSpec; record: unknown }
  | { kind: 'adopted'; prev: AppSpec }
  | {
      kind: 'rebuild';
      replaces: string;
      oldName?: string;
      databaseName: string;
      /** Entity types the gone database had that no blueprint makes, made again before the schema. */
      entityTypes?: EntityTypeSnapshot[];
    };

export type BuildPlan = {
  mode: BuildMode;
  /** The agent's spec, with the field hints its blueprint implies. */
  spec: AppSpec;
};

export const rebuildOf = (plan: Pick<BuildPlan, 'mode'>) =>
  plan.mode.kind === 'rebuild' ? plan.mode : null;
