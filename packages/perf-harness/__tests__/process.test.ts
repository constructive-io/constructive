import { resolve } from 'node:path';

import { runWorkerProcess } from '../src/process';
import type { WorkerConfig } from '../src/types';

describe('fresh worker process', () => {
  test('starts a distinct process for each measurement and forwards no database URL in output', async () => {
    const worker = resolve(__dirname, 'fixtures/fake-worker.js');
    const config: WorkerConfig = {
      arm: 'stock' as const,
      schemas: ['example'],
      allowedDependencySchemas: [],
    };
    const first = await runWorkerProcess(
      worker,
      'postgres://secret@example.test/database',
      config
    );
    const second = await runWorkerProcess(
      worker,
      'postgres://secret@example.test/database',
      config
    );
    expect(first.pid).not.toBe(process.pid);
    expect(second.pid).not.toBe(process.pid);
    expect(first.pid).not.toBe(second.pid);
    expect(JSON.stringify([first.result, second.result])).not.toContain('secret');
  });
});
