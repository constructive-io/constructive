
import assert from 'node:assert/strict';

import type { AppBuildDetails } from '../../src/pipeline/app-plan';
import { configureFastAppHost, type FastAppHost, hostPreviews } from '../../src/pipeline/host';
import { type BuildOutcome, successText } from '../../src/pipeline/result-text';

const details = (): AppBuildDetails => ({
  kind: 'app-build',
  name: 'Food bank',
  stage: 'done',
  phases: [],
  databaseName: 'food-bank'
});

const firstBuild = (built: AppBuildDetails) =>
  ({
    details: built,
    delta: { warnings: [] },
    resolved: {},
    update: false,
    outside: [],
    seedSkipped: [],
    resources: 4,
    genNotes: []
  }) as unknown as BuildOutcome;

test("without a previewUrl in the details, a build's result names no Preview", () => {
  const built = successText(firstBuild(details()));
  assert.match(built, /^Database: food-bank\.$/m);
  assert.doesNotMatch(built, /Preview|undefined/);
});

test('a host previews unless it says preview: false', () => {
  const host = (preview?: boolean) => ({ ...(preview === undefined ? {} : { preview }) }) as FastAppHost;
  configureFastAppHost(host());
  assert.equal(hostPreviews(), true);
  configureFastAppHost(host(true));
  assert.equal(hostPreviews(), true);
  configureFastAppHost(host(false));
  assert.equal(hostPreviews(), false);
});
