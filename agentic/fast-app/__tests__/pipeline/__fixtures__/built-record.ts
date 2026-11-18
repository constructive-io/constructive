import { landedOf } from '../../app-spec/__fixtures__/live-model-of';
import type { LiveModel } from '../../../src/app-spec/live-model';
import { overlayOf } from '../../../src/app-spec/overlay';
import type { AppSpec } from '../../../src/app-spec/types';

// The steps of a BuildRecord. The record's type comes with the pipeline
// (`build-record.ts`); until then this fixture is typed by its own shape.
type BuildSteps = { settled: boolean; codegen: boolean; seeded: boolean; gen: boolean };
type BuildExpect = { table: string; column?: string; present: boolean };

/** What a whole build of `spec` leaves in the record on `model`: every step done, every row landed. */
export function builtRecord(spec: AppSpec, model: LiveModel, steps: Partial<BuildSteps> = {}) {
  return {
    version: 3,
    kind: 'build',
    startedAt: '2026-10-19T10:00:00.000Z',
    database: { id: model.databaseId, name: 'food-bank', hash: model.hash },
    overlay: overlayOf(
      spec,
      model,
      null,
      model.tables.map((t) => t.id),
    ),
    seeded: landedOf(spec, model),
    steps: { settled: true, codegen: true, seeded: true, gen: true, ...steps },
    expect: [] as BuildExpect[]
  };
}
