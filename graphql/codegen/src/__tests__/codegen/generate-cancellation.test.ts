import * as fs from 'node:fs';
import http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';

import { runCodegenOperation } from '../../cli/handler';
import { generate, generateMulti } from '../../core/generate';

describe('codegen cancellation', () => {
  let tempDir: string;
  let server: http.Server | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegen-cancel-'));
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => (error ? reject(error) : resolve()));
      });
      server = undefined;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('preserves cancellation through generate instead of returning a failure result', async () => {
    let requestStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      requestStarted = resolve;
    });
    server = http.createServer(() => {
      requestStarted();
      // Deliberately never respond.
    });
    await new Promise<void>((resolve) =>
      server!.listen(0, '127.0.0.1', resolve)
    );
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Fixture server did not expose a TCP port.');
    }

    const controller = new AbortController();
    const reason = new Error('cancel generation');
    reason.name = 'AbortError';
    const output = path.join(tempDir, 'generated');
    const pending = generate({
      endpoint: `http://127.0.0.1:${address.port}/graphql`,
      output,
      orm: true,
      docs: false,
      signal: controller.signal,
      onProgress: () => undefined,
    });

    await started;
    controller.abort(reason);

    await expect(pending).rejects.toBe(reason);
    expect(fs.existsSync(output)).toBe(false);
  });

  it('propagates the operation signal before config or filesystem work', async () => {
    const controller = new AbortController();
    const reason = new Error('cancel operation');
    reason.name = 'AbortError';
    controller.abort(reason);

    await expect(
      runCodegenOperation(
        {
          schemaFile: 'missing.graphql',
          output: 'generated',
          orm: true,
        },
        { cwd: tempDir, signal: controller.signal }
      )
    ).rejects.toBe(reason);
    expect(fs.readdirSync(tempDir)).toEqual([]);
  });

  it('checks cancellation before multi-target cleanup or generation', async () => {
    const outputRoot = path.join(tempDir, 'generated');
    const staleTarget = path.join(outputRoot, 'stale');
    fs.mkdirSync(staleTarget, { recursive: true });
    fs.writeFileSync(path.join(outputRoot, '.targets'), '["stale"]\n');

    const controller = new AbortController();
    const reason = new Error('cancel multi-target operation');
    reason.name = 'AbortError';
    controller.abort(reason);

    await expect(
      generateMulti({
        configs: {
          current: {
            schemaFile: path.join(tempDir, 'missing.graphql'),
            output: path.join(outputRoot, 'current'),
            orm: true,
          },
        },
        cleanStaleTargets: true,
        signal: controller.signal,
      })
    ).rejects.toBe(reason);
    expect(fs.existsSync(staleTarget)).toBe(true);
  });
});
