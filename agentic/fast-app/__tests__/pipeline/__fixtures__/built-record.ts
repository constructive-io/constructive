import { landedOf } from '../../app-spec/__fixtures__/live-model-of';
import type { LiveModel } from '../../../src/app-spec/live-model';
import { overlayOf } from '../../../src/app-spec/overlay';
import type { AppSpec } from '../../../src/app-spec/types';
import type { BuildRecord } from '../../../src/pipeline/build-record';

/** What a whole build of `spec` leaves in the record on `model`: every step done, every row landed. */
export function builtRecord(
  spec: AppSpec,
  model: LiveModel,
  steps: Partial<BuildRecord['steps']> = {},
): BuildRecord {
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
    expect: [],
  };
}
