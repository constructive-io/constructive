import { resolve } from 'node:path';

import { runWorkerProcess } from '../src/process';

describe('fresh worker process', () => {
  test('uses distinct PIDs and does not expose the database URL', async () => {
    const worker = resolve(__dirname, 'fixtures/fake-worker.js');
    const definition = {
      name: 'baseline',
      workerConfig: { value: 1, schemaHash: 'same' },
    };
    const databaseUrl = 'postgres://secret@example.test/database';
    const first = await runWorkerProcess(worker, databaseUrl, definition);
    const second = await runWorkerProcess(worker, databaseUrl, definition);
    expect(first.pid).not.toBe(process.pid);
    expect(second.pid).not.toBe(process.pid);
    expect(first.pid).not.toBe(second.pid);
    expect(JSON.stringify([first.result, second.result])).not.toContain(
      databaseUrl
    );
  });
});
