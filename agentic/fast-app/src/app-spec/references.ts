// The checks the JSON Schema can't express: names that must exist or must not
// repeat, columns the database owns, seed rows that must fit their table, and
// UI that must name a table with a page.
// Each one would otherwise fail later, in the backend or the seed request,
// with an error that no longer points at the spec.

import { checkEntities, checkLinks } from './entity-checks';
import { checkExtend } from './extend-checks';
import { checkSeed } from './seed-checks';
import { seedPlan, SeedPlanError } from './seed-plan';
import { entityTypeTables, type SpecModel } from './spec-model';
import type { AppSpec, AppSpecError, SeedRow } from './types';
import { checkUi } from './ui-checks';

export function checkReferences(
  model: SpecModel,
  spec: AppSpec,
  landed?: Readonly<Record<string, readonly SeedRow[]>>,
): AppSpecError[] {
  const errors: AppSpecError[] = [];
  const backend = spec.backend.kind === 'custom' ? spec.backend : null;
  if (backend) {
    // A key or a link may also point at an entity type's table.
    const names = new Set([...backend.entities.map((e) => e.name), ...entityTypeTables(model)]);
    checkEntities(backend.entities, 'backend.entities', names, errors);
    checkLinks(backend.links ?? [], 'backend.links', names, errors);
  }
  checkExtend(model, spec, errors);
  checkSeed(model, spec, errors, landed);
  if (errors.length === 0) {
    try {
      seedPlan(spec, undefined, { model });
    } catch (err) {
      if (!(err instanceof SeedPlanError)) throw err;
      errors.push({ path: err.path, message: err.reason });
    }
  }
  checkUi(model, spec, errors);
  return errors;
}
