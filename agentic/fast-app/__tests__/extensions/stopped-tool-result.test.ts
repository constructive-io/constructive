import assert from 'node:assert/strict';

import {
  isStoppedToolDetails,
  STOPPED_TOOL_NOTE,
  stoppedToolResult,
} from '../../src/extensions/stopped-tool-result';

const aborted = { content: [{ type: 'text' as const, text: 'Command aborted' }], isError: true };

test('a stopped call puts the note first and keeps its own output', () => {
  const result = stoppedToolResult(aborted, true);
  assert.deepEqual(result?.content, [
    { type: 'text', text: STOPPED_TOOL_NOTE },
    { type: 'text', text: 'Command aborted' },
  ]);
  assert.equal(result?.isError, true);
  assert.equal(isStoppedToolDetails(result?.details), true);
});

test('an error in a run that the user did not stop stays as it is', () => {
  assert.equal(stoppedToolResult(aborted, false), undefined);
});

test('a call that finished cleanly after the stop keeps its real result', () => {
  const done = { content: [{ type: 'text' as const, text: 'ok' }], isError: false };
  assert.equal(stoppedToolResult(done, true), undefined);
});

test('only the stop marker reads as stopped details', () => {
  assert.equal(isStoppedToolDetails(undefined), false);
  assert.equal(isStoppedToolDetails({}), false);
  assert.equal(isStoppedToolDetails({ stoppedByUser: 'yes' }), false);
  assert.equal(isStoppedToolDetails({ stoppedByUser: true }), true);
});
