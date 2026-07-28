import * as fs from 'node:fs';
import http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  createCommandRegistry,
  executeCommand,
} from '@constructive-io/cli-runtime';

import { codegenCommand } from '../src/runtime/codegen-command';

describe('CNC codegen operation protocol', () => {
  let cwd: string;
  let server: http.Server | undefined;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-codegen-cancel-'));
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => (error ? reject(error) : resolve()));
      });
      server = undefined;
    }
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it('passes OperationContext.signal into endpoint introspection', async () => {
    let requestStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      requestStarted = resolve;
    });
    server = http.createServer(() => {
      requestStarted();
      // A successful cancellation must terminate this request without a reply.
    });
    await new Promise<void>((resolve) =>
      server!.listen(0, '127.0.0.1', resolve)
    );
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Fixture server did not expose a TCP port.');
    }

    const controller = new AbortController();
    const registry = createCommandRegistry([codegenCommand]);
    const pending = executeCommand(
      registry,
      codegenCommand,
      {
        endpoint: `http://127.0.0.1:${address.port}/graphql`,
        output: 'generated',
        orm: true,
      },
      {
        cwd,
        mode: 'agent',
        env: {},
        signal: controller.signal,
      }
    );

    await started;
    controller.abort();

    await expect(pending).resolves.toMatchObject({
      status: 'cancelled',
      error: { code: 'OPERATION_CANCELLED' },
    });
    expect(fs.existsSync(path.join(cwd, 'generated'))).toBe(false);
  });

  it.each([
    [
      'userinfo',
      (secret: string) => `http://user:${secret}@127.0.0.1:1/graphql`,
    ],
    [
      'credential query',
      (secret: string) => `http://127.0.0.1:1/graphql?api_key=${secret}`,
    ],
  ])(
    'rejects %s endpoints before emitting codegen events without leaking the secret',
    async (_case, endpointFor) => {
      const secret = 'codegen-endpoint-secret-that-must-not-leak';
      const registry = createCommandRegistry([codegenCommand]);
      const delivered: unknown[] = [];
      const outcome = await executeCommand(
        registry,
        codegenCommand,
        {
          endpoint: endpointFor(secret),
          output: 'generated',
          orm: true,
        },
        {
          cwd,
          mode: 'agent',
          env: {},
          sink: (event) => {
            delivered.push(event);
          },
        }
      );

      expect(outcome).toMatchObject({
        status: 'failed',
        error: { code: 'CODEGEN_ENDPOINT_INVALID' },
      });
      expect(
        outcome.protocolEvents.filter(
          ({ event }) => event === 'codegen.progress'
        )
      ).toEqual([]);
      expect(JSON.stringify({ outcome, delivered })).not.toContain(secret);
      expect(fs.existsSync(path.join(cwd, 'generated'))).toBe(false);
    }
  );

  it('redacts single-target config transport secrets while preserving the request', async () => {
    const authorizationSecret = 'single-authorization-secret';
    const headerSecret = 'single-custom-header-secret';
    const querySecret = 'single-query-secret';
    const requests: Array<{
      authorization?: string;
      customHeader?: string;
      url?: string;
    }> = [];
    server = http.createServer((request, response) => {
      const reflected = {
        authorization: request.headers.authorization,
        customHeader: request.headers['x-reflected-secret'] as
          | string
          | undefined,
        url: request.url,
      };
      requests.push(reflected);
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          errors: [
            {
              message: `Reflected ${reflected.authorization} ${reflected.customHeader} ${reflected.url}`,
            },
          ],
        })
      );
    });
    await new Promise<void>((resolve) =>
      server!.listen(0, '127.0.0.1', resolve)
    );
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Fixture server did not expose a TCP port.');
    }
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const configPath = path.join(cwd, 'graphql-codegen.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        endpoint: `${baseUrl}/graphql?tenant=${querySecret}`,
        authorization: `Bearer ${authorizationSecret}`,
        headers: { 'X-Reflected-Secret': headerSecret },
        output: 'generated',
        orm: true,
      })
    );
    const registry = createCommandRegistry([codegenCommand]);
    const delivered: unknown[] = [];

    const outcome = await executeCommand(
      registry,
      codegenCommand,
      { config: configPath },
      {
        cwd,
        mode: 'agent',
        env: {},
        sink: (event) => {
          delivered.push(event);
        },
      }
    );

    expect(outcome).toMatchObject({
      status: 'failed',
      error: { code: 'CODEGEN_FAILED' },
    });
    expect(requests).toEqual([
      {
        authorization: `Bearer ${authorizationSecret}`,
        customHeader: headerSecret,
        url: `/graphql?tenant=${querySecret}`,
      },
    ]);
    const progress = outcome.protocolEvents.filter(
      ({ event }) => event === 'codegen.progress'
    );
    expect(progress).toEqual([
      expect.objectContaining({
        phase: 'schema.fetch',
        message: `Fetching schema from endpoint: ${baseUrl}/graphql...`,
      }),
    ]);
    const serialized = JSON.stringify({ outcome, delivered });
    for (const secret of [authorizationSecret, headerSecret, querySecret]) {
      expect(serialized).not.toContain(secret);
    }
    expect(fs.existsSync(path.join(cwd, 'generated'))).toBe(false);
  });

  it('redacts all multi-target config transport secrets before either target reports', async () => {
    const targetSecrets = [
      {
        name: 'alpha',
        authorization: 'alpha-authorization-secret',
        header: 'alpha-header-secret',
        query: 'alpha-query-secret',
      },
      {
        name: 'beta',
        authorization: 'beta-authorization-secret',
        header: 'beta-header-secret',
        query: 'beta-query-secret',
      },
    ];
    const requests: Array<{
      authorization?: string;
      customHeader?: string;
      url?: string;
    }> = [];
    server = http.createServer((request, response) => {
      const reflected = {
        authorization: request.headers.authorization,
        customHeader: request.headers['x-reflected-secret'] as
          | string
          | undefined,
        url: request.url,
      };
      requests.push(reflected);
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          errors: [
            {
              message: `Reflected ${reflected.authorization} ${reflected.customHeader} ${reflected.url}`,
            },
          ],
        })
      );
    });
    await new Promise<void>((resolve) =>
      server!.listen(0, '127.0.0.1', resolve)
    );
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Fixture server did not expose a TCP port.');
    }
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const configPath = path.join(cwd, 'graphql-codegen.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        Object.fromEntries(
          targetSecrets.map((target) => [
            target.name,
            {
              endpoint: `${baseUrl}/${target.name}/graphql?tenant=${target.query}`,
              authorization: `Bearer ${target.authorization}`,
              headers: { 'X-Reflected-Secret': target.header },
              output: `generated/${target.name}`,
              orm: true,
            },
          ])
        )
      )
    );
    const registry = createCommandRegistry([codegenCommand]);
    const delivered: unknown[] = [];

    const outcome = await executeCommand(
      registry,
      codegenCommand,
      { config: configPath },
      {
        cwd,
        mode: 'agent',
        env: {},
        sink: (event) => {
          delivered.push(event);
        },
      }
    );

    expect(outcome).toMatchObject({
      status: 'failed',
      error: { code: 'CODEGEN_FAILED' },
    });
    expect(requests).toEqual(
      targetSecrets.map((target) => ({
        authorization: `Bearer ${target.authorization}`,
        customHeader: target.header,
        url: `/${target.name}/graphql?tenant=${target.query}`,
      }))
    );
    expect(
      outcome.protocolEvents
        .filter(({ event }) => event === 'codegen.progress')
        .map((event) => (event as unknown as { message: string }).message)
    ).toEqual(
      targetSecrets.map(
        (target) =>
          `Fetching schema from endpoint: ${baseUrl}/${target.name}/graphql...`
      )
    );
    const serialized = JSON.stringify({ outcome, delivered });
    for (const target of targetSecrets) {
      for (const secret of [
        target.authorization,
        target.header,
        target.query,
      ]) {
        expect(serialized).not.toContain(secret);
      }
    }
    expect(fs.existsSync(path.join(cwd, 'generated'))).toBe(false);
  });

  it.each([
    [
      'userinfo',
      (secret: string) => `http://user:${secret}@127.0.0.1:1/graphql`,
    ],
    [
      'credential query',
      (secret: string) => `http://127.0.0.1:1/graphql?api_key=${secret}`,
    ],
    ['fragment', (secret: string) => `http://127.0.0.1:1/graphql#${secret}`],
  ])(
    'rejects config endpoint %s before progress without leaking it',
    async (_case, endpointFor) => {
      const secret = 'unsafe-config-endpoint-secret';
      const configPath = path.join(cwd, 'graphql-codegen.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          endpoint: endpointFor(secret),
          output: 'generated',
          orm: true,
        })
      );
      const registry = createCommandRegistry([codegenCommand]);
      const delivered: unknown[] = [];

      const outcome = await executeCommand(
        registry,
        codegenCommand,
        { config: configPath },
        {
          cwd,
          mode: 'agent',
          env: {},
          sink: (event) => {
            delivered.push(event);
          },
        }
      );

      expect(outcome).toMatchObject({
        status: 'failed',
        error: { code: 'CODEGEN_ENDPOINT_INVALID' },
      });
      expect(
        outcome.protocolEvents.filter(
          ({ event }) => event === 'codegen.progress'
        )
      ).toEqual([]);
      expect(JSON.stringify({ outcome, delivered })).not.toContain(secret);
      expect(fs.existsSync(path.join(cwd, 'generated'))).toBe(false);
    }
  );

  it.each(['agent', 'ci', 'human'] as const)(
    'rejects explicit executable config before evaluation in %s mode',
    async (mode) => {
      const marker = path.join(cwd, `executed-${mode}`);
      const configPath = path.join(cwd, `malicious-${mode}.ts`);
      fs.writeFileSync(
        configPath,
        `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executed');\nexport default { schemaFile: './schema.graphql', orm: true };\n`
      );
      const registry = createCommandRegistry([codegenCommand]);

      const outcome = await executeCommand(
        registry,
        codegenCommand,
        { config: configPath, dryRun: true },
        { cwd, mode, env: {} }
      );

      expect(outcome).toMatchObject({
        status: 'failed',
        error: { code: 'CODEGEN_CONFIG_EXECUTABLE_UNSUPPORTED' },
      });
      expect(fs.existsSync(marker)).toBe(false);
    }
  );

  it('rejects auto-discovered executable config before dry-run evaluation', async () => {
    const marker = path.join(cwd, 'discovered-config-executed');
    fs.writeFileSync(
      path.join(cwd, 'graphql-codegen.config.ts'),
      `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executed');\nexport default { schemaFile: './schema.graphql', orm: true };\n`
    );
    const registry = createCommandRegistry([codegenCommand]);

    const outcome = await executeCommand(
      registry,
      codegenCommand,
      { dryRun: true },
      { cwd, mode: 'agent', env: {} }
    );

    expect(outcome).toMatchObject({
      status: 'failed',
      error: { code: 'CODEGEN_CONFIG_EXECUTABLE_UNSUPPORTED' },
    });
    expect(fs.existsSync(marker)).toBe(false);
  });

  it('auto-discovers declarative JSON config without requiring --config', async () => {
    fs.writeFileSync(
      path.join(cwd, 'schema.graphql'),
      'type Query { hello: String }\n'
    );
    fs.writeFileSync(
      path.join(cwd, 'graphql-codegen.config.json'),
      JSON.stringify({
        schemaFile: './schema.graphql',
        schema: { enabled: true, output: './generated' },
      })
    );
    const registry = createCommandRegistry([codegenCommand]);

    const outcome = await executeCommand(
      registry,
      codegenCommand,
      { dryRun: true },
      { cwd, mode: 'agent', env: {} }
    );

    expect(outcome).toMatchObject({
      status: 'completed',
      result: { data: { success: true, dryRun: true }, artifacts: [] },
    });
    expect(fs.existsSync(path.join(cwd, 'generated'))).toBe(false);
  });

  it('returns retained transaction warnings and artifacts without changing data', async () => {
    const source = path.join(cwd, 'schema.graphql');
    fs.writeFileSync(source, 'type Query { hello: String }\n');
    const nativeFs = require('node:fs') as typeof fs;
    const originalRemove = nativeFs.rmSync;
    let cleanupFailureInjected = false;
    const removeSpy = jest
      .spyOn(nativeFs, 'rmSync')
      .mockImplementation((target, options) => {
        if (
          !cleanupFailureInjected &&
          String(target).includes('.codegen-transaction-')
        ) {
          cleanupFailureInjected = true;
          throw new Error('injected transaction cleanup failure');
        }
        return originalRemove(target, options);
      });

    const registry = createCommandRegistry([codegenCommand]);
    let outcome: Awaited<ReturnType<typeof executeCommand>>;
    try {
      outcome = await executeCommand(
        registry,
        codegenCommand,
        {
          schemaFile: source,
          schemaEnabled: true,
          schemaOutput: 'generated',
        },
        { cwd, mode: 'agent', env: {} }
      );
    } finally {
      removeSpy.mockRestore();
    }

    expect(outcome).toMatchObject({
      status: 'completed',
      result: {
        data: { success: true },
        warnings: [
          {
            code: 'CODEGEN_RECOVERY_RETAINED',
            message: expect.stringContaining(
              'injected transaction cleanup failure'
            ),
          },
        ],
        artifacts: expect.arrayContaining([
          expect.objectContaining({ type: 'codegen-recovery' }),
        ]),
      },
    });
    expect(
      (outcome as { result?: { data?: unknown } }).result?.data
    ).not.toHaveProperty('recoveryPath');
    const recoveryArtifact = (
      outcome as {
        result?: { artifacts?: Array<{ type: string; path: string }> };
      }
    ).result?.artifacts?.find(({ type }) => type === 'codegen-recovery');
    expect(recoveryArtifact).toBeDefined();
    expect(fs.existsSync(recoveryArtifact!.path)).toBe(true);
  });

  it('includes rollback recovery evidence in structured failure details', async () => {
    const source = path.join(cwd, 'schema.graphql');
    fs.writeFileSync(source, 'type Query { hello: String }\n');
    const registry = createCommandRegistry([codegenCommand]);
    const input = {
      schemaFile: source,
      schemaEnabled: true,
      schemaOutput: 'generated',
    };
    const initial = await executeCommand(registry, codegenCommand, input, {
      cwd,
      mode: 'agent',
      env: {},
    });
    expect(initial.status).toBe('completed');
    fs.appendFileSync(
      source,
      '\nextend type Query { recoveryProbe: String }\n'
    );

    const nativeFs = require('node:fs') as typeof fs;
    const originalRename = nativeFs.renameSync;
    let renameCall = 0;
    const renameSpy = jest
      .spyOn(nativeFs, 'renameSync')
      .mockImplementation((from, to) => {
        renameCall += 1;
        if (renameCall === 2) throw new Error('injected commit failure');
        if (renameCall === 3) throw new Error('injected restore failure');
        return originalRename(from, to);
      });

    let outcome: Awaited<ReturnType<typeof executeCommand>>;
    try {
      outcome = await executeCommand(registry, codegenCommand, input, {
        cwd,
        mode: 'agent',
        env: {},
      });
    } finally {
      renameSpy.mockRestore();
    }

    expect(outcome).toMatchObject({
      status: 'failed',
      error: {
        code: 'CODEGEN_FAILED',
        details: {
          recoveryPath: expect.stringContaining('.codegen-transaction-'),
          rollbackErrors: [expect.stringContaining('injected restore failure')],
        },
      },
    });
    const recoveryPath = (
      outcome as { error?: { details?: { recoveryPath?: string } } }
    ).error?.details?.recoveryPath;
    expect(recoveryPath).toBeDefined();
    expect(fs.existsSync(recoveryPath!)).toBe(true);
  });
});
