// FastAppHost.preview: a host that can't open the app's dev server (a cloud
// Job's pod) gets no previewUrl in the details, and no result names one.

import assert from 'node:assert/strict';

import type { AppBuildDetails } from '../../src/pipeline/app-plan';
import { configureFastAppHost, type FastAppHost, hostPreviews } from '../../src/pipeline/host';
import { PhaseError } from '../../src/pipeline/progress';
import {
  type BuildOutcome,
  failureText,
  successText,
  verifyFailedText
} from '../../src/pipeline/result-text';

const URL = 'http://localhost:3001';

const details = (previewUrl?: string): AppBuildDetails => ({
  kind: 'app-build',
  name: 'Food bank',
  stage: 'done',
  phases: [],
  databaseName: 'food-bank',
  ...(previewUrl ? { previewUrl } : {})
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

const failure = () => new PhaseError('verify', 'GET /shifts answered 500.', 'Fix the page.');

test('a host with a Preview gets the dev server named in the results, as on the desktop', () => {
  assert.match(successText(firstBuild(details(URL))), /^Database: food-bank\. Preview: http:\/\/localhost:3001\.$/m);
  assert.match(failureText(failure(), '/p/packages/app', details(URL), []), /Its dev server runs at http:\/\/localhost:3001/);
  assert.match(verifyFailedText(failure(), details(URL)), /The dev server runs at http:\/\/localhost:3001\./);
});

test('without a previewUrl in the details, no result names a Preview or a dev server address', () => {
  const built = successText(firstBuild(details()));
  assert.match(built, /^Database: food-bank\.$/m);
  assert.doesNotMatch(built, /Preview|undefined/);
  assert.doesNotMatch(failureText(failure(), '/p/packages/app', details(), []), /dev server runs at|undefined/);
  assert.doesNotMatch(verifyFailedText(failure(), details()), /dev server runs at|undefined/);
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
