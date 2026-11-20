import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { touchedFiles } from '../../src/pipeline/touched-files';

const call = (name: string, file: string) => ({
  type: 'message',
  message: { role: 'assistant', content: [{ type: 'toolCall', name, arguments: { path: file } }] },
});

test('only project files the agent wrote or edited join the app commit', () => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'touched-'));
  mkdirSync(path.join(cwd, 'docs'));
  writeFileSync(path.join(cwd, 'README.md'), '# app');
  writeFileSync(path.join(cwd, 'docs', 'notes.md'), 'notes');
  writeFileSync(path.join(cwd, 'scratch.txt'), 'not touched by a tool');

  const files = touchedFiles(
    [
      call('edit', 'README.md'),
      call('write', path.join(cwd, 'docs', 'notes.md')),
      call('write', 'packages/app/src/app/(app)/page.tsx'), // the app is staged anyway
      call('write', '../outside.md'), // outside the project
      call('write', 'deleted-since.md'), // no longer there
      call('read', 'scratch.txt'), // a read touches nothing
      { type: 'message', message: { role: 'toolResult', content: [] } },
    ],
    cwd,
  );

  assert.deepEqual(files, ['README.md', 'docs/notes.md']);
});
