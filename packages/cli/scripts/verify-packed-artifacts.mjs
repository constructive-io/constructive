#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import {
  createCliEnvironment,
  parsePackedArguments,
} from './packed-acceptance-support.mjs';

const protocolVersion = 'constructive.dev/cli/v1';
const terminalEvents = new Set([
  'operation.completed',
  'operation.failed',
  'operation.cancelled',
]);

const fail = (message) => {
  throw new Error(message);
};

const run = (command, args, options = {}) => {
  const { label, ...spawnOptions } = options;
  const child = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    ...spawnOptions,
  });

  if (child.error) {
    fail(
      `${label ?? basename(command)} could not start: ${child.error.message}`
    );
  }

  return child;
};

const assertSuccessfulCheck = (label, child) => {
  if (child.status !== 0) {
    fail(
      [
        `${label} exited with ${child.status ?? `signal ${child.signal}`}.`,
        child.stdout ? `stdout:\n${child.stdout}` : undefined,
        child.stderr ? `stderr:\n${child.stderr}` : undefined,
      ]
        .filter(Boolean)
        .join('\n')
    );
  }
};

const assertPublishedEntrypoints = (label, packageDirectory) => {
  const manifestPath = join(packageDirectory, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  for (const field of ['main', 'module', 'types']) {
    const target = manifest[field];
    if (typeof target !== 'string' || target.length === 0) {
      fail(`${label} does not declare a non-empty ${field} entrypoint.`);
    }
    if (!existsSync(join(packageDirectory, target))) {
      fail(`${label} declares missing ${field} entrypoint ${target}.`);
    }
  }
};

const readCliProtocol = (label, child, expectedStatus, expectedCommandId) => {
  if (child.status !== expectedStatus) {
    fail(
      [
        `${label} exited with ${child.status ?? `signal ${child.signal}`}; expected ${expectedStatus}.`,
        child.stdout ? `stdout:\n${child.stdout}` : undefined,
        child.stderr ? `stderr:\n${child.stderr}` : undefined,
      ]
        .filter(Boolean)
        .join('\n')
    );
  }
  if (child.stderr !== '') {
    fail(`${label} wrote to structured stderr:\n${child.stderr}`);
  }
  if (/\u001b\[[0-?]*[ -/]*[@-~]/.test(child.stdout)) {
    fail(`${label} emitted ANSI control sequences in agent mode.`);
  }
  if (!child.stdout.endsWith('\n')) {
    fail(`${label} did not terminate its JSONL stream with a newline.`);
  }

  const payload = child.stdout.endsWith('\r\n')
    ? child.stdout.slice(0, -2)
    : child.stdout.slice(0, -1);
  const lines = payload.split(/\r?\n/);
  if (lines.some((line) => line.length === 0 || line !== line.trim())) {
    fail(`${label} emitted stray whitespace in its JSONL stream.`);
  }
  let events;
  try {
    events = lines.map((line) => JSON.parse(line));
  } catch (error) {
    fail(
      `${label} emitted non-JSON protocol output: ${
        error instanceof Error ? error.message : String(error)
      }\n${child.stdout}`
    );
  }

  if (events[0]?.event !== 'operation.started') {
    fail(`${label} did not begin with operation.started.`);
  }
  if (events.filter((event) => terminalEvents.has(event?.event)).length !== 1) {
    fail(`${label} did not emit exactly one terminal event.`);
  }

  for (const event of events) {
    if (event?.protocolVersion !== protocolVersion) {
      fail(`${label} emitted an unexpected protocol version.`);
    }
    if (event?.commandId !== expectedCommandId) {
      fail(`${label} emitted an unexpected command ID.`);
    }
    if (
      typeof event?.operationId !== 'string' ||
      event.operationId.length < 1
    ) {
      fail(`${label} emitted an invalid operation ID.`);
    }
    if (
      typeof event?.timestamp !== 'string' ||
      Number.isNaN(Date.parse(event.timestamp))
    ) {
      fail(`${label} emitted an invalid timestamp.`);
    }
  }
  if (events.some((event) => event.operationId !== events[0].operationId)) {
    fail(`${label} changed operation IDs before its terminal event.`);
  }

  return events;
};

const assertCliProtocol = (label, child) => {
  const events = readCliProtocol(label, child, 0, 'discovery.version');
  if (events.length !== 2) {
    fail(`${label} emitted ${events.length} events; expected exactly 2.`);
  }
  if (events[1]?.event !== 'operation.completed') {
    fail(`${label} did not end with operation.completed.`);
  }

  if (
    typeof events[1]?.result?.data?.version !== 'string' ||
    events[1].result.data.version.length < 1 ||
    events[1]?.result?.data?.protocolVersion !== protocolVersion
  ) {
    fail(`${label} emitted an invalid discovery.version result.`);
  }
};

const assertJsonVersionEnvelope = (label, child) => {
  if (child.status !== 0) {
    fail(`${label} exited with ${child.status}; expected 0.`);
  }
  if (child.stderr !== '') {
    fail(`${label} wrote to structured stderr:\n${child.stderr}`);
  }
  if (/\u001b\[[0-?]*[ -/]*[@-~]/.test(child.stdout)) {
    fail(`${label} emitted ANSI control sequences in JSON mode.`);
  }
  if (child.stdout.trim().split(/\r?\n/).length !== 1) {
    fail(`${label} did not emit exactly one JSON envelope.`);
  }

  let envelope;
  try {
    envelope = JSON.parse(child.stdout);
  } catch (error) {
    fail(
      `${label} emitted invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  if (
    envelope?.protocolVersion !== protocolVersion ||
    envelope?.event !== 'operation.completed' ||
    envelope?.commandId !== 'discovery.version' ||
    typeof envelope?.result?.data?.version !== 'string'
  ) {
    fail(`${label} emitted an invalid discovery.version JSON envelope.`);
  }
};

const assertInvalidInvocation = (label, child) => {
  const events = readCliProtocol(label, child, 2, 'cli.invocation');
  if (
    events.length !== 2 ||
    events[1]?.event !== 'operation.failed' ||
    events[1]?.error?.code !== 'CLI_COMMAND_NOT_FOUND' ||
    events[1]?.error?.category !== 'invocation'
  ) {
    fail(`${label} did not emit the expected invalid-invocation failure.`);
  }
};

const assertInternalFailure = (label, child) => {
  const events = readCliProtocol(label, child, 70, 'fixture.invalid-output');
  if (
    events.length !== 2 ||
    events[1]?.event !== 'operation.failed' ||
    events[1]?.error?.code !== 'CLI_INTERNAL_ERROR' ||
    events[1]?.error?.category !== 'internal'
  ) {
    fail(`${label} did not emit the expected internal contract failure.`);
  }
};

const assertSignalCancellation = (label, child) => {
  const events = readCliProtocol(label, child, 130, 'explorer.start');
  const names = events.map((event) => event.event);
  for (const required of [
    'service.starting',
    'service.ready',
    'service.stopping',
    'service.stopped',
    'operation.cancelled',
  ]) {
    if (!names.includes(required)) {
      fail(`${label} did not emit ${required}: ${names.join(',')}`);
    }
  }
};

const shellQuote = (value) => `'${value.replaceAll("'", `'"'"'`)}'`;

const assertCodegenSourceFailure = (label, child) => {
  const events = readCliProtocol(label, child, 1, 'codegen.generate');
  if (events.length !== 2) {
    fail(`${label} emitted ${events.length} events; expected exactly 2.`);
  }
  if (events[1]?.event !== 'operation.failed') {
    fail(`${label} did not end with operation.failed.`);
  }

  if (
    events[1]?.error?.code !== 'CODEGEN_SOURCE_REQUIRED' ||
    events[1]?.error?.category !== 'configuration' ||
    events[1]?.error?.retryable !== false
  ) {
    fail(`${label} did not emit the expected known codegen source failure.`);
  }
};

const assertCapabilityUnavailable = (label, child, expectedCommandId) => {
  const events = readCliProtocol(label, child, 1, expectedCommandId);
  if (events.length !== 2 || events[1]?.event !== 'operation.failed') {
    fail(`${label} did not emit one failed terminal event.`);
  }
  if (
    events[1]?.error?.code !== 'CAPABILITY_UNAVAILABLE' ||
    events[1]?.error?.category !== 'configuration' ||
    events[1]?.error?.retryable !== false
  ) {
    fail(`${label} did not emit the expected unavailable-capability error.`);
  }
};

const main = () => {
  const { installArchives, suite } = parsePackedArguments(
    process.argv.slice(2)
  );
  const installationDirectory = mkdtempSync(
    join(tmpdir(), 'cnc-package-acceptance-')
  );

  try {
    writeFileSync(
      join(installationDirectory, 'package.json'),
      '{"name":"cnc-package-acceptance","private":true}\n'
    );

    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const installation = run(
      npm,
      [
        'install',
        '--ignore-scripts',
        '--engine-strict',
        '--no-audit',
        '--no-fund',
        '--loglevel=error',
        ...(suite === 'core' ? ['--omit=optional'] : []),
        ...installArchives,
      ],
      { cwd: installationDirectory, label: 'package installation' }
    );
    assertSuccessfulCheck('package installation', installation);

    const runtimeChecks = [
      [
        'runtime CommonJS require()',
        [
          '-e',
          `const runtime = require('@constructive-io/cli-runtime');
if (runtime.PROTOCOL_VERSION !== '${protocolVersion}') process.exit(1);
if (typeof runtime.CommandRegistry !== 'function') process.exit(1);`,
        ],
      ],
      [
        'runtime ESM import()',
        [
          '--input-type=module',
          '-e',
          `const runtime = await import('@constructive-io/cli-runtime');
if (runtime.PROTOCOL_VERSION !== '${protocolVersion}') process.exit(1);
if (typeof runtime.CommandRegistry !== 'function') process.exit(1);`,
        ],
      ],
    ];

    for (const [label, args] of runtimeChecks) {
      const child = run(process.execPath, args, {
        cwd: installationDirectory,
        label,
      });
      assertSuccessfulCheck(label, child);
      if (child.stdout !== '' || child.stderr !== '') {
        fail(`${label} produced unexpected output.`);
      }
    }

    const cncRuntimeChecks = [
      [
        'CNC runtime CommonJS require()',
        [
          '-e',
          `const runtime = require('@constructive-io/cli/runtime');
const config = require('@constructive-io/cli/config');
const manager = require('@constructive-io/cli/config/config-manager');
if (typeof runtime.createCncRegistryForEnvironment !== 'function') process.exit(1);
if (typeof runtime.ConfigStore !== 'function') process.exit(1);
if (config.ConfigStore !== manager.ConfigStore) process.exit(1);
runtime.createCncRegistryForEnvironment({ version: 'test', env: {}, configDir: process.cwd() });`,
        ],
      ],
      [
        'CNC runtime ESM import()',
        [
          '--input-type=module',
          '-e',
          `const runtime = await import('@constructive-io/cli/runtime');
const config = await import('@constructive-io/cli/config');
const manager = await import('@constructive-io/cli/config/config-manager');
if (typeof runtime.createCncRegistryForEnvironment !== 'function') process.exit(1);
if (typeof runtime.ConfigStore !== 'function') process.exit(1);
if (config.ConfigStore !== manager.ConfigStore) process.exit(1);
runtime.createCncRegistryForEnvironment({ version: 'test', env: {}, configDir: process.cwd() });`,
        ],
      ],
    ];

    for (const [label, args] of cncRuntimeChecks) {
      const child = run(process.execPath, args, {
        cwd: installationDirectory,
        label,
      });
      assertSuccessfulCheck(label, child);
      if (child.stdout !== '' || child.stderr !== '') {
        fail(`${label} produced unexpected output.`);
      }
    }

    const cliPackageDirectory = join(
      installationDirectory,
      'node_modules',
      '@constructive-io',
      'cli'
    );
    const binaryDirectory = join(installationDirectory, 'node_modules', '.bin');
    const binarySuffix = process.platform === 'win32' ? '.cmd' : '';
    const cliEnvironment = createCliEnvironment(installationDirectory);
    const packageImportChecks = [
      [
        'graphql-codegen CommonJS require()',
        [
          '-e',
          `const codegen = require('@constructive-io/graphql-codegen');
if (typeof codegen.generate !== 'function') process.exit(1);`,
        ],
      ],
      [
        'graphql-codegen ESM import()',
        [
          '--input-type=module',
          '-e',
          `const codegen = await import('@constructive-io/graphql-codegen');
if (typeof codegen.generate !== 'function' && typeof codegen.default?.generate !== 'function') process.exit(1);`,
        ],
      ],
    ];

    if (suite === 'full') {
      const codegenPackageDirectory = join(
        installationDirectory,
        'node_modules',
        '@constructive-io',
        'graphql-codegen'
      );
      assertPublishedEntrypoints(
        '@constructive-io/graphql-codegen',
        codegenPackageDirectory
      );

      for (const [label, args] of packageImportChecks) {
        const child = run(process.execPath, args, {
          cwd: installationDirectory,
          env: cliEnvironment,
          label,
        });
        assertSuccessfulCheck(label, child);
        if (child.stdout !== '' || child.stderr !== '') {
          fail(`${label} produced unexpected output.`);
        }
      }
    }

    const directCliChecks = [
      [
        'CLI CommonJS entrypoint',
        process.execPath,
        [join(cliPackageDirectory, 'index.js')],
      ],
      [
        'CLI ESM entrypoint',
        process.execPath,
        [join(cliPackageDirectory, 'esm', 'index.js')],
      ],
    ];

    for (const [label, command, prefixArguments] of directCliChecks) {
      const child = run(command, [...prefixArguments, 'version', '--agent'], {
        cwd: installationDirectory,
        env: cliEnvironment,
        label,
      });
      assertCliProtocol(label, child);
    }

    const jsonVersion = run(
      process.execPath,
      [join(cliPackageDirectory, 'index.js'), 'version', '--format', 'json'],
      {
        cwd: installationDirectory,
        env: cliEnvironment,
        input: '',
        label: 'CLI JSON envelope with closed stdin',
      }
    );
    assertJsonVersionEnvelope(
      'CLI JSON envelope with closed stdin',
      jsonVersion
    );

    const invalidInvocation = run(
      process.execPath,
      [join(cliPackageDirectory, 'index.js'), 'definitely-unknown', '--agent'],
      {
        cwd: installationDirectory,
        env: cliEnvironment,
        input: '',
        label: 'CLI invalid invocation',
      }
    );
    assertInvalidInvocation('CLI invalid invocation', invalidInvocation);

    const removedJobsInvocation = run(
      process.execPath,
      [join(cliPackageDirectory, 'index.js'), 'jobs', 'up', '--agent'],
      {
        cwd: installationDirectory,
        env: cliEnvironment,
        input: '',
        label: 'removed jobs invocation',
      }
    );
    assertInvalidInvocation('removed jobs invocation', removedJobsInvocation);

    const invalidOutputFixture = run(
      process.execPath,
      [
        '-e',
        `const {
  createCommandRegistry, createJsonlSink, defineCommand, executeCommand,
  exitCodeForOutcome, Type,
} = require('@constructive-io/cli-runtime');
const command = defineCommand({
  id: 'fixture.invalid-output', path: ['fixture'], summary: 'Invalid output fixture.',
  input: Type.Object({}, { additionalProperties: false }),
  output: Type.Object({ ok: Type.Boolean() }, { additionalProperties: false }),
  bindings: [], examples: [{ argv: ['fixture'] }], lifecycle: 'finite', effect: 'read',
  async execute() { return { data: { ok: 'invalid' } }; },
});
(async () => {
  const outcome = await executeCommand(
    createCommandRegistry([command]), command, {},
    { cwd: process.cwd(), mode: 'agent', sink: createJsonlSink((line) => process.stdout.write(line)) },
  );
  process.exitCode = exitCodeForOutcome(outcome);
})().catch((error) => {
  process.stderr.write(error instanceof Error ? error.message : String(error));
  process.exitCode = 71;
});`,
      ],
      {
        cwd: installationDirectory,
        env: cliEnvironment,
        input: '',
        label: 'packed runtime invalid output',
      }
    );
    assertInternalFailure(
      'packed runtime invalid output',
      invalidOutputFixture
    );

    const nonTtyInteractive = run(
      process.execPath,
      [
        join(cliPackageDirectory, 'index.js'),
        'version',
        '--interactive',
        '--format',
        'human',
      ],
      {
        cwd: installationDirectory,
        env: cliEnvironment,
        input: '',
        label: 'non-TTY interactive rejection',
      }
    );
    if (
      nonTtyInteractive.status !== 2 ||
      nonTtyInteractive.stdout !== '' ||
      !nonTtyInteractive.stderr.includes('CLI_INTERACTIVE_REQUIRES_TTY')
    ) {
      fail(
        `non-TTY interactive rejection did not exit 2 with CLI_INTERACTIVE_REQUIRES_TTY.\n${nonTtyInteractive.stdout}${nonTtyInteractive.stderr}`
      );
    }

    if (process.platform === 'linux') {
      const ttyCommand = [
        process.execPath,
        join(cliPackageDirectory, 'index.js'),
        'version',
        '--interactive',
        '--format',
        'human',
      ]
        .map(shellQuote)
        .join(' ');
      const ttyProbe = run(
        'script',
        ['-q', '-e', '-c', ttyCommand, '/dev/null'],
        {
          cwd: installationDirectory,
          env: cliEnvironment,
          input: '',
          label: 'Linux TTY interactive probe',
        }
      );
      assertSuccessfulCheck('Linux TTY interactive probe', ttyProbe);
      if (
        ttyProbe.stderr !== '' ||
        ttyProbe.stdout.trim().length === 0 ||
        ttyProbe.stdout.includes(protocolVersion) ||
        /\u001b\[[0-?]*[ -/]*[@-~]/.test(ttyProbe.stdout)
      ) {
        fail(
          `Linux TTY interactive probe emitted unexpected output.\n${ttyProbe.stdout}${ttyProbe.stderr}`
        );
      }
    }

    if (suite === 'full') {
      const codegenProbe = run(
        process.execPath,
        [
          join(cliPackageDirectory, 'index.js'),
          'codegen',
          '--agent',
          '--debug',
        ],
        {
          cwd: installationDirectory,
          env: cliEnvironment,
          label: 'packed codegen adapter',
        }
      );
      assertCodegenSourceFailure('packed codegen adapter', codegenProbe);
    } else {
      const unavailableProbes = [
        [
          'packed codegen capability',
          ['codegen', '--agent'],
          'codegen.generate',
        ],
        ['packed server capability', ['server', '--agent'], 'server.start'],
        [
          'packed explorer capability',
          ['explorer', '--agent'],
          'explorer.start',
        ],
      ];
      for (const [label, args, commandId] of unavailableProbes) {
        const child = run(
          process.execPath,
          [join(cliPackageDirectory, 'index.js'), ...args],
          {
            cwd: installationDirectory,
            env: cliEnvironment,
            label,
          }
        );
        assertCapabilityUnavailable(label, child, commandId);
      }
    }

    const serviceProbePrefix = `
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createCncRegistryForEnvironment } = require('@constructive-io/cli/runtime');
const { executeCommand } = require('@constructive-io/cli-runtime');
const controller = new AbortController();
const bundle = createCncRegistryForEnvironment({ version: 'test', env: { HOME: process.cwd() }, configDir: process.cwd() });
let sawReady = false;
const timeout = setTimeout(() => controller.abort(new DOMException('service probe timed out', 'AbortError')), 15000);
`;
    const serviceProbeSuffix = `
clearTimeout(timeout);
if (!sawReady) throw new Error('service never emitted readiness');
if (outcome.status !== 'cancelled') throw new Error('service did not cancel cleanly: ' + JSON.stringify(outcome.error));
const names = outcome.protocolEvents.map((event) => event.event);
for (const required of ['service.starting', 'service.ready', 'service.stopping', 'service.stopped', 'operation.cancelled']) {
  if (!names.includes(required)) throw new Error('missing lifecycle event ' + required + ': ' + names.join(','));
}
`;
    const serviceChecks = [
      [
        'packed explorer lifecycle adapter',
        `${serviceProbePrefix}
const outcome = await executeCommand(bundle.registry, 'explorer.start', { port: 0 }, {
  cwd: process.cwd(), mode: 'agent', env: { HOME: process.cwd() }, signal: controller.signal,
  sink: async (event) => {
    if (event.event === 'service.ready') {
      sawReady = true;
      controller.abort(new DOMException('service probe complete', 'AbortError'));
    }
  },
});
${serviceProbeSuffix}`,
      ],
    ];
    if (suite === 'full') {
      for (const [label, source] of serviceChecks) {
        const child = run(
          process.execPath,
          ['--input-type=module', '-e', source],
          {
            cwd: installationDirectory,
            env: cliEnvironment,
            timeout: 30000,
            label,
          }
        );
        assertSuccessfulCheck(label, child);
        if (child.stdout !== '' || child.stderr !== '') {
          fail(
            `${label} produced unexpected output.\n${child.stdout}${child.stderr}`
          );
        }
      }

      const signalSupervisor = `
import { spawn } from 'node:child_process';
const child = spawn(process.execPath, [
  ${JSON.stringify(join(cliPackageDirectory, 'index.js'))},
  'explorer', '--port', '0', '--agent',
], { cwd: process.cwd(), env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
let stdout = '';
let stderr = '';
let pending = '';
let signalled = false;
let timedOut = false;
child.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  stdout += text;
  pending += text;
  for (;;) {
    const newline = pending.indexOf('\\n');
    if (newline < 0) break;
    const line = pending.slice(0, newline);
    pending = pending.slice(newline + 1);
    try {
      const event = JSON.parse(line);
      if (!signalled && event.event === 'service.ready') {
        signalled = true;
        child.kill('SIGINT');
      }
    } catch {}
  }
});
child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
const timeout = setTimeout(() => {
  timedOut = true;
  child.kill('SIGKILL');
}, 20000);
const result = await new Promise((resolveClose) => {
  child.once('close', (code, signal) => resolveClose({ code, signal }));
});
clearTimeout(timeout);
process.stdout.write(stdout);
process.stderr.write(stderr);
if (timedOut) process.stderr.write('explorer SIGINT probe timed out\\n');
process.exitCode = result.code ?? 1;
`;
      const signalProbe = run(
        process.execPath,
        ['--input-type=module', '-e', signalSupervisor],
        {
          cwd: installationDirectory,
          env: cliEnvironment,
          input: '',
          timeout: 30000,
          label: 'packed explorer SIGINT lifecycle',
        }
      );
      assertSignalCancellation('packed explorer SIGINT lifecycle', signalProbe);
    }

    const aliasChecks = [
      ['cnc bin alias', join(binaryDirectory, `cnc${binarySuffix}`)],
      [
        'constructive bin alias',
        join(binaryDirectory, `constructive${binarySuffix}`),
      ],
    ];
    for (const [label, command] of aliasChecks) {
      const child = run(command, ['version', '--agent'], {
        cwd: installationDirectory,
        env: cliEnvironment,
        label,
      });
      assertCliProtocol(label, child);
    }

    process.stdout.write(
      `Packed CNC ${suite} acceptance passed on Node ${process.version}.\n`
    );
  } finally {
    rmSync(installationDirectory, { recursive: true, force: true });
  }
};

try {
  main();
} catch (error) {
  process.stderr.write(
    `Packed CNC acceptance failed on Node ${process.version}: ${
      error instanceof Error ? error.message : String(error)
    }\n`
  );
  process.exitCode = 1;
}
