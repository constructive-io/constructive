import assert from 'node:assert/strict';

import { planDelta } from '../../../src/app-spec/delta';
import type { AppSpecDelta } from '../../../src/app-spec/delta-types';

/** The delta of a change the test expects to run; a refusal fails the test. */
export function deltaOf(...args: Parameters<typeof planDelta>): AppSpecDelta {
  const plan = planDelta(...args);
  if (plan.ok === false) assert.fail(plan.refused.map((r) => `${r.path}: ${r.message}`).join('\n'));
  return plan.delta;
}
