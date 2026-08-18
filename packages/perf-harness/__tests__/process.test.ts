import { resolve } from 'node:path';

import { parseWorkerProcessArgs, runWorkerProcess } from '../src/process';

describe('worker CLI protocol', () => {
  const encodedConfig = Buffer.from(
    JSON.stringify({ caseName: 'baseline', workerConfig: { value: 1 } })
  ).toString('base64url');

  test('parses the database URL and worker envelope from CLI arguments', () => {
    expect(
      parseWorkerProcessArgs([
        '--database-url',
        'postgres:///benchmark',
        '--worker-config',
        encodedConfig,
      ])
    ).toEqual({
      databaseUrl: 'postgres:///benchmark',
      envelope: { caseName: 'baseline', workerConfig: { value: 1 } },
    });
  });

  test('rejects missing, duplicate, and unsupported worker arguments', () => {
    expect(() =>
      parseWorkerProcessArgs(['--worker-config', encodedConfig])
    ).toThrow('--database-url is required');
    expect(() =>
      parseWorkerProcessArgs(['--database-url', 'postgres:///benchmark'])
    ).toThrow('--worker-config is required');
    expect(() =>
      parseWorkerProcessArgs([
        '--database-url',
        'postgres:///one',
        '--database-url',
        'postgres:///two',
        '--worker-config',
        encodedConfig,
      ])
    ).toThrow('--database-url may only be specified once');
    expect(() =>
      parseWorkerProcessArgs([
        '--database-url',
        'postgres:///benchmark',
        '--worker-config',
        encodedConfig,
        '--unexpected',
        'value',
      ])
    ).toThrow("unsupported worker argument '--unexpected'");
  });
});

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
