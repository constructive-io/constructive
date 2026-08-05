import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { parse } from 'graphql';

import {
  assertCatalogDockerContainerIdentity,
  catalogBackendSamplerEnvironment,
  catalogIntrospectionBuildIdentity,
  type CatalogMemorySnapshot,
  catalogPercentile,
  catalogProgressPath,
  catalogSchemaContractIdentity,
  makeCatalogBackendSamplerLaunchSpec,
  makeCatalogWarmOperationSource,
  measureCatalogBuildWithBackendSampler,
  parseCatalogBackendProcStatus,
  parseCatalogBackendSamplerMode,
  parseCatalogBuildStateRetirement,
  parseCatalogDockerContainerIdentity,
  parseCatalogIntrospectionClientReleaseMode,
  parseCatalogSchemaLayout,
  parseCatalogScopedCatalogTypes,
  parseCatalogTenantProxySurfaces,
  parseCatalogV8Profile,
  parseCatalogWarmthCliOptions,
  projectCatalogTenantDensity,
  resolveCatalogBackendPidAfterBuild,
  resolveCatalogSchemaLayout,
  stopCatalogBackendSamplerProcessTree,
  summarizeBuildTransientSamples,
  summarizeCatalogBackendMemorySamples,
  validateCatalogPostgresContainer,
  validateCatalogRuntimeFlags,
  validateCatalogWarmthConfig,
  writeCatalogProgress
} from '../catalog-bench';

describe('catalog benchmark schema layout', () => {
  it('preserves the legacy one-schema-per-instance CLI shape', () => {
    expect(parseCatalogSchemaLayout([
      '--schemas', 'gd_t001_api,gd_t002_api'
    ], 2)).toEqual({
      schemas: ['gd_t001_api', 'gd_t002_api'],
      schemaSets: null,
      allowedDependencySchemas: null
    });
  });

  it('parses one ordered multi-schema surface and explicit dependency closure', () => {
    const layout = parseCatalogSchemaLayout([
      '--surface-schemas', 'app_public,app_auth,app_users',
      '--allowed-dependency-schemas', 'app_extensions,jwt_private'
    ], 1);
    expect(layout).toEqual({
      schemas: ['app_public'],
      schemaSets: [['app_public', 'app_auth', 'app_users']],
      allowedDependencySchemas: ['app_extensions', 'jwt_private']
    });
    expect(resolveCatalogSchemaLayout({
      schemas: layout.schemas,
      schemaSets: layout.schemaSets!,
      allowedDependencySchemas: layout.allowedDependencySchemas!,
      checkpoints: [1]
    })).toEqual(layout);
    expect(parseCatalogSchemaLayout([
      '--surface-schemas', 'app_public,app_auth',
      '--allowed-dependency-schemas', ''
    ], 1)).toEqual({
      schemas: ['app_public'],
      schemaSets: [['app_public', 'app_auth']],
      allowedDependencySchemas: []
    });
  });

  it.each([
    [
      ['--surface-schemas', 'app_public,app_auth'],
      1,
      'requires --allowed-dependency-schemas'
    ],
    [
      [
        '--surface-schemas', 'app_public,,app_auth',
        '--allowed-dependency-schemas', 'app_extensions'
      ],
      1,
      'must not contain empty schema names'
    ],
    [
      [
        '--surface-schemas', 'app_public,app_public',
        '--allowed-dependency-schemas', 'app_extensions'
      ],
      1,
      'must contain unique schema names'
    ],
    [
      [
        '--surface-schemas', 'app_public,app_auth',
        '--allowed-dependency-schemas', 'app_auth'
      ],
      1,
      'must not overlap'
    ],
    [
      [
        '--surface-schemas', 'app_public,app_auth',
        '--allowed-dependency-schemas', 'app_extensions'
      ],
      2,
      'requires exactly one resident instance'
    ],
    [
      ['--schemas', 'app_public', '--surface-schemas', 'app_auth'],
      1,
      'mutually exclusive'
    ],
    [
      ['--schemas', 'app_public', '--allowed-dependency-schemas', 'app_extensions'],
      1,
      'requires --surface-schemas'
    ]
  ])('rejects ambiguous schema layout %#', (args, instances, message) => {
    expect(() => parseCatalogSchemaLayout(
      args as string[],
      instances as number
    )).toThrow(message as string);
  });

  it('rejects manually edited worker layouts and hashes both ordered lists', () => {
    expect(() => resolveCatalogSchemaLayout({
      schemas: ['app_auth'],
      schemaSets: [['app_public', 'app_auth']],
      allowedDependencySchemas: ['app_extensions'],
      checkpoints: [1]
    })).toThrow('schemas[0] must equal the first ordered');
    expect(() => resolveCatalogSchemaLayout({
      schemas: ['app_public'],
      schemaSets: [['app_public', 'app_auth']],
      allowedDependencySchemas: ['app_extensions', 'app_extensions'],
      checkpoints: [1]
    })).toThrow('must contain unique schema names');

    const identity = catalogSchemaContractIdentity(
      ['app_public', 'app_auth'],
      ['app_extensions', 'jwt_private']
    );
    expect(identity).not.toBe(catalogSchemaContractIdentity(
      ['app_auth', 'app_public'],
      ['app_extensions', 'jwt_private']
    ));
    expect(identity).not.toBe(catalogSchemaContractIdentity(
      ['app_public', 'app_auth'],
      ['jwt_private', 'app_extensions']
    ));
    expect(catalogSchemaContractIdentity(['app_public'], [])).not.toBe(
      catalogSchemaContractIdentity(['app_public'], ['app_extensions'])
    );
  });
});

describe('catalog benchmark scoped catalog type policy', () => {
  it('preserves all catalog types as the scoped default', () => {
    expect(parseCatalogScopedCatalogTypes([], 'scoped-required')).toBe('all');
    expect(parseCatalogScopedCatalogTypes([], 'stock')).toBeNull();
  });

  it('parses the dependency-closure experiment strictly', () => {
    expect(parseCatalogScopedCatalogTypes([
      '--scoped-catalog-types', 'dependency-closure'
    ], 'scoped-required')).toBe('dependency-closure');
  });

  it.each([
    [['--scoped-catalog-types'], 'scoped-required', 'requires a value'],
    [[
      '--scoped-catalog-types', 'all',
      '--scoped-catalog-types', 'dependency-closure'
    ], 'scoped-required', 'may only be specified once'],
    [['--scoped-catalog-types', 'closure'], 'scoped-required', "must be 'all' or 'dependency-closure'"],
    [['--scoped-catalog-types', 'all'], 'stock', 'requires --mode scoped-required']
  ])('rejects malformed catalog policy arguments %j', (args, mode, message) => {
    expect(() => parseCatalogScopedCatalogTypes(
      args as string[],
      mode as 'stock' | 'scoped-required'
    )).toThrow(message as string);
  });

  it('separates all-types and dependency-closure build identities', () => {
    const all = catalogIntrospectionBuildIdentity('scoped-required', 'all');
    const closure = catalogIntrospectionBuildIdentity(
      'scoped-required',
      'dependency-closure'
    );

    expect(all).not.toBe(closure);
    expect(catalogIntrospectionBuildIdentity('stock', null)).not.toBe(all);
    expect(catalogIntrospectionBuildIdentity(
      'scoped-required',
      'dependency-closure',
      true
    )).not.toBe(closure);
    expect(catalogIntrospectionBuildIdentity(
      'scoped-required',
      'dependency-closure',
      false,
      'destroy'
    )).not.toBe(closure);
  });

  it('keeps exact introspection client destruction explicitly opt-in', () => {
    expect(parseCatalogIntrospectionClientReleaseMode([])).toBe('reuse');
    expect(parseCatalogIntrospectionClientReleaseMode([
      '--introspection-client-release-mode', 'destroy'
    ])).toBe('destroy');
  });

  it.each([
    [['--introspection-client-release-mode'], 'requires a value'],
    [[
      '--introspection-client-release-mode', 'reuse',
      '--introspection-client-release-mode', 'destroy'
    ], 'may only be specified once'],
    [[
      '--introspection-client-release-mode', 'discard'
    ], "must be 'reuse' or 'destroy'"]
  ])('rejects malformed introspection release arguments %j', (args, message) => {
    expect(() => parseCatalogIntrospectionClientReleaseMode(args)).toThrow(message);
  });

  it('keeps build-state retirement explicitly opt-in', () => {
    expect(parseCatalogBuildStateRetirement([])).toBe(false);
    expect(parseCatalogBuildStateRetirement([
      '--release-build-state-after-validation'
    ])).toBe(true);
    expect(() => parseCatalogBuildStateRetirement([
      '--release-build-state-after-validation',
      '--release-build-state-after-validation'
    ])).toThrow('may only be specified once');
  });
});

describe('catalog benchmark V8 runtime provenance', () => {
  it('defaults to stock and parses only the named profiles', () => {
    expect(parseCatalogV8Profile([])).toBe('stock');
    expect(parseCatalogV8Profile([
      '--v8-profile', 'optimize-for-size'
    ])).toBe('optimize-for-size');
    expect(parseCatalogV8Profile([
      '--v8-profile', 'baseline-optimize-for-size'
    ])).toBe('baseline-optimize-for-size');
    expect(parseCatalogV8Profile([
      '--v8-profile', 'jitless-optimize-for-size'
    ])).toBe('jitless-optimize-for-size');
  });

  it.each([
    [['--v8-profile'], 'requires a value'],
    [[
      '--v8-profile', 'stock',
      '--v8-profile', 'optimize-for-size'
    ], 'may only be specified once'],
    [['--v8-profile', 'jitless'], "v8Profile must be 'stock'"]
  ])('rejects malformed V8 profile arguments %j', (args, message) => {
    expect(() => parseCatalogV8Profile(args as string[])).toThrow(message as string);
  });

  it('proves the exact configured and observed worker flags', () => {
    const runtime = {
      heapMiB: 1024,
      v8Profile: 'jitless-optimize-for-size' as const,
      nodeOptions: '--max-old-space-size=1024',
      nodeOptionsArgv: ['--max-old-space-size=1024'],
      nodeExecArgv: ['--jitless', '--optimize-for-size', '--expose-gc'],
      effectiveNodeRuntimeFlags: [
        '--max-old-space-size=1024',
        '--jitless',
        '--optimize-for-size',
        '--expose-gc'
      ]
    };

    expect(() => validateCatalogRuntimeFlags(runtime, {
      nodeOptions: runtime.nodeOptions,
      nodeOptionsArgv: [...runtime.nodeOptionsArgv],
      nodeExecArgv: [...runtime.nodeExecArgv],
      effectiveNodeRuntimeFlags: [...runtime.effectiveNodeRuntimeFlags]
    })).not.toThrow();
    expect(() => validateCatalogRuntimeFlags(runtime, {
      nodeOptions: runtime.nodeOptions,
      nodeOptionsArgv: [...runtime.nodeOptionsArgv],
      nodeExecArgv: ['--optimize-for-size', '--expose-gc'],
      effectiveNodeRuntimeFlags: [
        '--max-old-space-size=1024',
        '--optimize-for-size',
        '--expose-gc'
      ]
    })).toThrow('process.execArgv does not match');
  });

  it('proves the baseline-size worker flags exactly', () => {
    const runtime = {
      heapMiB: 1024,
      v8Profile: 'baseline-optimize-for-size' as const,
      nodeOptions: '--max-old-space-size=1024',
      nodeOptionsArgv: ['--max-old-space-size=1024'],
      nodeExecArgv: ['--max-opt=1', '--optimize-for-size', '--expose-gc'],
      effectiveNodeRuntimeFlags: [
        '--max-old-space-size=1024',
        '--max-opt=1',
        '--optimize-for-size',
        '--expose-gc'
      ]
    };
    expect(() => validateCatalogRuntimeFlags(runtime, runtime)).not.toThrow();
  });

  it('rejects a managed profile flag hidden in NODE_OPTIONS', () => {
    expect(() => validateCatalogRuntimeFlags({
      heapMiB: 1024,
      v8Profile: 'stock',
      nodeOptions: '--jitless --max-old-space-size=1024',
      nodeOptionsArgv: ['--jitless', '--max-old-space-size=1024'],
      nodeExecArgv: ['--expose-gc'],
      effectiveNodeRuntimeFlags: [
        '--jitless',
        '--max-old-space-size=1024',
        '--expose-gc'
      ]
    }, {
      nodeOptions: '--jitless --max-old-space-size=1024',
      nodeOptionsArgv: ['--jitless', '--max-old-space-size=1024'],
      nodeExecArgv: ['--expose-gc'],
      effectiveNodeRuntimeFlags: [
        '--jitless',
        '--max-old-space-size=1024',
        '--expose-gc'
      ]
    })).toThrow('configured Node runtime flags are inconsistent');
  });
});

describe('catalog benchmark PostgreSQL backend lifecycle', () => {
  const backendIdentity = {
    pid: 101,
    backendStartEpochMs: 1_700_000_000_500
  };
  const replacementIdentity = {
    pid: 202,
    backendStartEpochMs: 1_700_000_010_500
  };
  const backendStatus = (input: {
    name?: string;
    namespacePid?: number;
    rssKiB?: number;
    highWaterKiB?: number;
  } = {}): string => [
    `Name:\t${input.name ?? 'postgres'}`,
    `NSpid:\t70000\t${input.namespacePid ?? 101}`,
    `VmHWM:\t${input.highWaterKiB ?? 2048} kB`,
    `VmRSS:\t${input.rssKiB ?? 1024} kB`
  ].join('\n');

  const backendMeasurement = (input: {
    source?: 'docker-container-procfs-diagnostic' | 'local-linux-procfs';
  } = {}) => summarizeCatalogBackendMemorySamples({
    backendIdentity,
    samplerPid: 501,
    source: input.source ?? 'docker-container-procfs-diagnostic',
    postgresContainer: 'postgres-density',
    samples: [
      {
        monotonicMs: 1_000,
        rssBytes: 100,
        highWaterBytes: 150,
        procStartTicks: 50_000,
        procStartEpochMs: 1_700_000_000_000,
        bootTimeEpochSeconds: 1_699_999_500,
        clockTicksPerSecond: 100
      },
      {
        monotonicMs: 1_010,
        rssBytes: 180,
        highWaterBytes: 220,
        procStartTicks: 50_000,
        procStartEpochMs: 1_700_000_000_000,
        bootTimeEpochSeconds: 1_699_999_500,
        clockTicksPerSecond: 100
      },
      {
        monotonicMs: 1_020,
        rssBytes: 140,
        highWaterBytes: 240,
        procStartTicks: 50_000,
        procStartEpochMs: 1_700_000_000_000,
        bootTimeEpochSeconds: 1_699_999_500,
        clockTicksPerSecond: 100
      }
    ],
    targetExitedBeforeStop: true,
    targetExitedAtMonotonicMs: 1_030,
    samplerStartedAt: '2026-08-02T00:00:00.000Z',
    samplerReadyAt: '2026-08-02T00:00:00.005Z',
    buildStartedAt: '2026-08-02T00:00:00.010Z',
    buildCompletedAt: '2026-08-02T00:00:00.040Z',
    samplerStopRequestedAt: '2026-08-02T00:00:00.045Z',
    samplerStoppedAt: '2026-08-02T00:00:00.050Z',
    buildDurationMs: 30,
    clientPlatform: 'linux',
    clientArchitecture: 'x64'
  });

  it('binds proc status to the exact PostgreSQL namespace PID', () => {
    expect(parseCatalogBackendProcStatus(backendStatus(), 101)).toEqual({
      rssBytes: 1024 * 1024,
      highWaterBytes: 2048 * 1024
    });
    expect(() => parseCatalogBackendProcStatus(
      backendStatus({ namespacePid: 202 }),
      101
    )).toThrow('identity did not match exact PID 101');
    expect(() => parseCatalogBackendProcStatus(
      backendStatus({ name: 'node' }),
      101
    )).toThrow('identity did not match exact PID 101');
    expect(() => parseCatalogBackendProcStatus(
      backendStatus().replace(/^VmHWM:.*$/m, ''),
      101
    )).toThrow('valid VmHWM');
  });

  it('rejects container arguments that Docker could parse as options', () => {
    expect(() => validateCatalogPostgresContainer('postgres-density.1')).not.toThrow();
    expect(() => validateCatalogPostgresContainer('--privileged')).toThrow(
      "invalid PostgreSQL container name '--privileged'"
    );
    expect(() => validateCatalogPostgresContainer('postgres/density')).toThrow(
      'invalid PostgreSQL container name'
    );
  });

  it('pins diagnostic Docker launches to an immutable ID and clears shell env', () => {
    const secretVariableNames = [
      'PGPASSWORD',
      'DATABASE_URL',
      'GRAPHQL_OBSERVABILITY_TOKEN',
      'AWS_SECRET_ACCESS_KEY'
    ];
    const environment = {
      PATH: '/usr/bin',
      HOME: '/tmp/test-home',
      DOCKER_HOST: 'unix:///tmp/docker.sock',
      ...Object.fromEntries(secretVariableNames.map((name) => [name, `value-${name}`]))
    };
    const containerIdentity = parseCatalogDockerContainerIdentity(
      `${'a'.repeat(64)}\t2026-08-02T00:00:00.000Z\t70000`,
      'postgres-density'
    );
    const launch = makeCatalogBackendSamplerLaunchSpec({
      backendIdentity,
      containerIdentity,
      clientPlatform: 'darwin',
      environment
    })!;

    expect(catalogBackendSamplerEnvironment(environment)).toEqual({
      PATH: '/usr/bin',
      HOME: '/tmp/test-home',
      DOCKER_HOST: 'unix:///tmp/docker.sock'
    });
    expect(launch.command).toBe('docker');
    expect(launch.args.slice(0, 7)).toEqual([
      'exec',
      '-i',
      'a'.repeat(64),
      '/usr/bin/env',
      '-i',
      'PATH=/usr/bin:/bin',
      '/bin/sh'
    ]);
    expect(launch.hostEnvironmentVariableNames).toEqual([
      'DOCKER_HOST',
      'HOME',
      'PATH'
    ]);
    const serializedLaunch = JSON.stringify(launch);
    for (const name of secretVariableNames) {
      expect(launch.hostEnvironmentVariableNames).not.toContain(name);
      expect(serializedLaunch).not.toContain(`value-${name}`);
    }
    const script = launch.args[launch.args.indexOf('-c') + 1];
    expect(script).toContain('trap cleanup_sampler EXIT');
    expect(script).toContain('wait "$sampler_pid"');
  });

  it('fails immutable container revalidation even when a backend PID matches', () => {
    const expected = parseCatalogDockerContainerIdentity(
      `${'a'.repeat(64)}\t2026-08-02T00:00:00.000Z\t70000`,
      'postgres-density'
    );
    const wrongContainer = parseCatalogDockerContainerIdentity(
      `${'b'.repeat(64)}\t2026-08-02T00:00:00.000Z\t70001`,
      'postgres-density'
    );
    expect(() => assertCatalogDockerContainerIdentity(
      expected,
      wrongContainer
    )).toThrow('changed immutable identity');
  });

  it('records identity-bound sampled peaks only as diagnostic lower bounds', () => {
    expect(backendMeasurement()).toEqual(expect.objectContaining({
      backendPid: 101,
      backendStartEpochMs: 1_700_000_000_500,
      baselineRssBytes: 100,
      baselineHighWaterBytes: 150,
      sampledPeakRssLowerBoundBytes: 180,
      sampledHighWaterLowerBoundBytes: 240,
      sampledPeakRssDeltaLowerBoundBytes: 80,
      sampledHighWaterDeltaLowerBoundBytes: 90,
      sampleCount: 3,
      targetExitedBeforeStop: true,
      timing: expect.objectContaining({
        configuredIntervalMs: 10,
        maximumConclusiveGapMs: 50,
        maximumObservedGapMs: 10,
        coveredBuildWindow: true,
        cadenceConclusive: true,
        samplerLaunchToReadyMs: 5,
        samplerStopRequestToCloseMs: 5
      }),
      observerEffect: expect.objectContaining({
        correctionApplied: false,
        pairedComparisonSupported: true,
        measuredLaunchToReadyMs: 5,
        measuredStopRequestToCloseMs: 5
      }),
      provenance: expect.objectContaining({
        samplerProcess: 'dedicated-external-procfs-loop',
        samplerPid: 501,
        source: 'docker-container-procfs-diagnostic',
        backendSamplerAuthority: 'diagnostic-only',
        serviceDensityMemoryAuthority:
          'separately-validated-linux-cgroup-v2-memory.current',
        semantics: 'diagnostic-lower-bound-without-pre-destroy-acknowledgement',
        dockerInitialExecEnvironment:
          'may-inherit-container-config-before-env-i',
        samplerShellEnvironment: 'env-i-path-only',
        backendIdentity: expect.objectContaining({
          sqlBackendStartEpochMs: 1_700_000_000_500,
          procStartTicks: 50_000,
          toleranceMs: 1_500
        })
      })
    }));
    expect(backendMeasurement().provenance.limitation).toContain(
      'diagnostic lower bound'
    );
  });

  it('labels Docker transport separately without changing lower-bound semantics', () => {
    const measurement = backendMeasurement();
    expect(measurement.timing.cadenceConclusive).toBe(true);
    expect(measurement.provenance.backendSamplerAuthority).toBe('diagnostic-only');
    expect(measurement.provenance.limitation).toContain('Docker Desktop');
    expect(measurement.provenance.limitation).toContain(
      'separately validated Linux cgroup-v2 memory.current'
    );
  });

  it('rejects a changed proc start token and an out-of-tolerance SQL identity', () => {
    const changedToken = backendMeasurement({ source: 'local-linux-procfs' });
    const mismatchedSamples = [
      {
        monotonicMs: 1_000,
        rssBytes: 100,
        highWaterBytes: 150,
        procStartTicks: 60_000,
        procStartEpochMs: 1_700_000_010_000,
        bootTimeEpochSeconds: 1_699_999_500,
        clockTicksPerSecond: 100
      }
    ];
    expect(changedToken.provenance.backendIdentity.procStartTicks).toBe(50_000);
    expect(() => summarizeCatalogBackendMemorySamples({
      backendIdentity,
      samplerPid: 501,
      source: 'local-linux-procfs',
      postgresContainer: null,
      samples: mismatchedSamples,
      targetExitedBeforeStop: false,
      samplerStartedAt: '2026-08-02T00:00:00.000Z',
      samplerReadyAt: '2026-08-02T00:00:00.005Z',
      buildStartedAt: '2026-08-02T00:00:00.010Z',
      buildCompletedAt: '2026-08-02T00:00:00.040Z',
      samplerStopRequestedAt: '2026-08-02T00:00:00.045Z',
      samplerStoppedAt: '2026-08-02T00:00:00.050Z',
      buildDurationMs: 30
    })).toThrow('mismatched process start identity');
  });

  it('marks sparse cadence inconclusive without promoting its lower bound', () => {
    const measurement = summarizeCatalogBackendMemorySamples({
      backendIdentity,
      samplerPid: 501,
      source: 'local-linux-procfs',
      postgresContainer: null,
      samples: [
        {
          monotonicMs: 1_000,
          rssBytes: 100,
          highWaterBytes: 150,
          procStartTicks: 50_000,
          procStartEpochMs: 1_700_000_000_000,
          bootTimeEpochSeconds: 1_699_999_500,
          clockTicksPerSecond: 100
        },
        {
          monotonicMs: 1_075,
          rssBytes: 180,
          highWaterBytes: 220,
          procStartTicks: 50_000,
          procStartEpochMs: 1_700_000_000_000,
          bootTimeEpochSeconds: 1_699_999_500,
          clockTicksPerSecond: 100
        }
      ],
      targetExitedBeforeStop: false,
      samplerStartedAt: '2026-08-02T00:00:00.000Z',
      samplerReadyAt: '2026-08-02T00:00:00.005Z',
      buildStartedAt: '2026-08-02T00:00:00.010Z',
      buildCompletedAt: '2026-08-02T00:00:00.070Z',
      samplerStopRequestedAt: '2026-08-02T00:00:00.075Z',
      samplerStoppedAt: '2026-08-02T00:00:00.080Z',
      buildDurationMs: 60
    });

    expect(measurement.timing.maximumObservedGapMs).toBe(75);
    expect(measurement.timing.cadenceConclusive).toBe(false);
    expect(measurement.sampledHighWaterLowerBoundBytes).toBe(220);
    expect(measurement.sampledHighWaterDeltaLowerBoundBytes).toBe(70);
    expect(measurement.provenance.backendSamplerAuthority).toBe('diagnostic-only');
    expect(measurement.provenance.limitation).toContain('maximum observed gap');
  });

  it('supports explicit sampler-on and sampler-off observer comparisons', () => {
    expect(parseCatalogBackendSamplerMode([])).toBe('diagnostic-lower-bound');
    expect(parseCatalogBackendSamplerMode([
      '--postgres-backend-sampler', 'off'
    ])).toBe('off');
    expect(() => parseCatalogBackendSamplerMode([
      '--postgres-backend-sampler', 'exact'
    ])).toThrow("must be 'off' or 'diagnostic-lower-bound'");
  });

  it('stops an already-exited worker without signaling a reused process group', async () => {
    const requestGracefulStop = jest.fn();
    const signalProcessGroup = jest.fn();
    await expect(stopCatalogBackendSamplerProcessTree({
      requestGracefulStop,
      waitForTreeExit: async () => true,
      signalProcessGroup
    })).resolves.toBe('already-exited');
    expect(requestGracefulStop).not.toHaveBeenCalled();
    expect(signalProcessGroup).not.toHaveBeenCalled();
  });

  it('escalates bounded cleanup through TERM and KILL until no tree remains', async () => {
    const waits = [false, false, false, true];
    const signalProcessGroup = jest.fn();
    await expect(stopCatalogBackendSamplerProcessTree({
      requestGracefulStop: jest.fn(),
      waitForTreeExit: async () => waits.shift()!,
      signalProcessGroup,
      gracefulTimeoutMs: 1,
      termTimeoutMs: 1,
      killTimeoutMs: 1
    })).resolves.toBe('sigkill');
    expect(waits).toHaveLength(0);
    expect(signalProcessGroup.mock.calls).toEqual([
      ['SIGTERM'],
      ['SIGKILL']
    ]);
  });

  it('fails cleanup when the process tree survives KILL', async () => {
    await expect(stopCatalogBackendSamplerProcessTree({
      requestGracefulStop: jest.fn(),
      waitForTreeExit: async () => false,
      signalProcessGroup: jest.fn(),
      gracefulTimeoutMs: 1,
      termTimeoutMs: 1,
      killTimeoutMs: 1
    })).rejects.toThrow('survived SIGKILL');
  });

  it('still reaps the tree when the graceful stop write fails', async () => {
    const waits = [false, false, true];
    const signalProcessGroup = jest.fn();
    await expect(stopCatalogBackendSamplerProcessTree({
      requestGracefulStop: () => {
        throw new Error('stdin failed');
      },
      waitForTreeExit: async () => waits.shift()!,
      signalProcessGroup,
      gracefulTimeoutMs: 1,
      termTimeoutMs: 1,
      killTimeoutMs: 1
    })).rejects.toThrow('stdin failed');
    expect(waits).toHaveLength(0);
    expect(signalProcessGroup).toHaveBeenCalledWith('SIGTERM');
  });

  it('starts before the build and stops before PID retirement and replacement', async () => {
    const order: string[] = [];
    const measurement = backendMeasurement();
    const sampled = await measureCatalogBuildWithBackendSampler({
      startSampler: async () => {
        order.push('sampler:start');
        return {
          stop: async () => {
            order.push('sampler:stop');
            return measurement;
          }
        };
      },
      build: async () => {
        order.push('build');
        return 'built';
      }
    });
    const transition = await resolveCatalogBackendPidAfterBuild(
      'destroy',
      backendIdentity,
      {
        waitForRetirement: async () => {
          order.push('backend:retired');
        },
        acquireBackendIdentity: async () => {
          order.push('replacement:acquired');
          return replacementIdentity;
        }
      }
    );

    expect(sampled.value).toBe('built');
    expect(sampled.backendMemoryLowerBound).toBe(measurement);
    expect(transition.steadyBackendPid).toBe(202);
    expect(order).toEqual([
      'sampler:start',
      'build',
      'sampler:stop',
      'backend:retired',
      'replacement:acquired'
    ]);
  });

  it('still stops the sampler when the Graphile build fails', async () => {
    const stop = jest.fn(async () => backendMeasurement());
    await expect(measureCatalogBuildWithBackendSampler({
      startSampler: async () => ({ stop }),
      build: async () => {
        throw new Error('build failed');
      }
    })).rejects.toThrow('build failed');
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('fails the build result when the configured sampler fails', async () => {
    await expect(measureCatalogBuildWithBackendSampler({
      startSampler: async () => ({
        stop: async () => {
          throw new Error('sampler failed');
        }
      }),
      build: async () => 'built'
    })).rejects.toThrow('sampler failed');
  });

  it('keeps the same backend in reuse mode without a retirement probe', async () => {
    const waitForRetirement = jest.fn(async (): Promise<void> => undefined);
    const acquireBackendIdentity = jest.fn(async () => backendIdentity);

    await expect(resolveCatalogBackendPidAfterBuild('reuse', backendIdentity, {
      waitForRetirement,
      acquireBackendIdentity
    })).resolves.toEqual({
      introspectionBackendPid: 101,
      introspectionBackendStartEpochMs: 1_700_000_000_500,
      steadyBackendPid: 101,
      steadyBackendStartEpochMs: 1_700_000_000_500,
      introspectionBackendRetired: false
    });
    expect(waitForRetirement).not.toHaveBeenCalled();
    expect(acquireBackendIdentity).toHaveBeenCalledTimes(1);
  });

  it('proves retirement before acquiring and recording the replacement', async () => {
    const order: string[] = [];
    const waitForRetirement = jest.fn(async (
      identity: typeof backendIdentity
    ): Promise<void> => {
      order.push(`retired:${identity.pid}`);
    });
    const acquireBackendIdentity = jest.fn(async () => {
      order.push('acquired:202');
      return replacementIdentity;
    });

    await expect(resolveCatalogBackendPidAfterBuild('destroy', backendIdentity, {
      waitForRetirement,
      acquireBackendIdentity
    })).resolves.toEqual({
      introspectionBackendPid: 101,
      introspectionBackendStartEpochMs: 1_700_000_000_500,
      steadyBackendPid: 202,
      steadyBackendStartEpochMs: 1_700_000_010_500,
      introspectionBackendRetired: true
    });
    expect(order).toEqual(['retired:101', 'acquired:202']);
  });

  it('fails closed on unexpected PID reuse or rotation', async () => {
    await expect(resolveCatalogBackendPidAfterBuild('destroy', backendIdentity, {
      waitForRetirement: async () => undefined,
      acquireBackendIdentity: async () => ({
        pid: 101,
        backendStartEpochMs: 1_700_000_020_500
      })
    })).rejects.toThrow('destroyed PostgreSQL introspection backend 101 was reused');
    await expect(resolveCatalogBackendPidAfterBuild('reuse', backendIdentity, {
      waitForRetirement: async () => undefined,
      acquireBackendIdentity: async () => replacementIdentity
    })).rejects.toThrow('PostgreSQL benchmark backend identity changed');
  });
});

describe('catalog benchmark cache warmth', () => {
  it('preserves the disabled defaults', () => {
    expect(parseCatalogWarmthCliOptions([])).toEqual({
      warmOperationsPerInstance: 0,
      warmOperationReplayPasses: 0,
      grafastCacheLimits: {
        queryCacheMaxLength: null,
        operationsCacheMaxLength: null,
        operationOperationPlansCacheMaxLength: null
      }
    });
  });

  it('parses independently configurable positive cache limits', () => {
    expect(parseCatalogWarmthCliOptions([
      '--warm-operations-per-instance', '500',
      '--warm-operation-replay-passes', '3',
      '--grafast-query-cache-max', '8',
      '--grafast-operations-cache-max', '16',
      '--grafast-operation-plans-cache-max', '32'
    ])).toEqual({
      warmOperationsPerInstance: 500,
      warmOperationReplayPasses: 3,
      grafastCacheLimits: {
        queryCacheMaxLength: 8,
        operationsCacheMaxLength: 16,
        operationOperationPlansCacheMaxLength: 32
      }
    });
  });

  it.each([
    [['--warm-operations-per-instance'], 'requires a value'],
    [['--warm-operations-per-instance', '-1'], 'non-negative integer'],
    [['--warm-operations-per-instance', '1.5'], 'non-negative integer'],
    [['--warm-operations-per-instance', '01'], 'non-negative integer'],
    [['--warm-operation-replay-passes'], 'requires a value'],
    [['--warm-operation-replay-passes', '-1'], 'non-negative integer'],
    [['--warm-operation-replay-passes', '1.5'], 'non-negative integer'],
    [['--warm-operation-replay-passes', '01'], 'non-negative integer'],
    [['--grafast-query-cache-max', '0'], 'positive safe integer'],
    [['--grafast-query-cache-max', '1'], 'safe integer of at least 2'],
    [['--grafast-operations-cache-max', '-1'], 'positive integer'],
    [['--grafast-operation-plans-cache-max', '1e2'], 'positive integer'],
    [[
      '--grafast-query-cache-max', '8',
      '--grafast-query-cache-max', '16'
    ], 'may only be specified once']
  ])('rejects malformed warmth arguments %j', (args, message) => {
    expect(() => parseCatalogWarmthCliOptions(args as string[])).toThrow(message as string);
  });

  it('rejects incomplete worker cache-limit configuration', () => {
    expect(() => validateCatalogWarmthConfig({
      warmOperationsPerInstance: 1,
      warmOperationReplayPasses: 0,
      grafastCacheLimits: {
        queryCacheMaxLength: null,
        operationsCacheMaxLength: null
      } as never
    })).toThrow('must define all three cache limit fields');
  });

  it('requires a populated source set when replay is enabled', () => {
    expect(() => parseCatalogWarmthCliOptions([
      '--warm-operation-replay-passes', '1'
    ])).toThrow(
      'warmOperationReplayPasses requires warmOperationsPerInstance'
    );
  });

  it('generates stable, distinct, valid source operations', () => {
    const sources = Array.from(
      { length: 500 },
      (_, index) => makeCatalogWarmOperationSource(index + 1)
    );
    expect(new Set(sources).size).toBe(500);
    expect(sources[0]).toBe(
      'query CatalogWarm1 { warmTenantToken: tenantToken }'
    );
    expect(() => sources.forEach((source) => parse(source))).not.toThrow();
    expect(() => makeCatalogWarmOperationSource(0)).toThrow('positive safe integer');
  });

  it('uses the nearest-rank percentile deterministically', () => {
    expect(catalogPercentile([], 0.5)).toBeNull();
    expect(catalogPercentile([9, 1, 5, 3], 0.5)).toBe(3);
    expect(catalogPercentile([9, 1, 5, 3], 0.99)).toBe(9);
    expect(() => catalogPercentile([1], 0)).toThrow('percentile probability');
  });

  it('summarizes sampled and process-high-water build transients', () => {
    expect(summarizeBuildTransientSamples(
      { heapUsedBytes: 100, rssBytes: 200, processPeakRssBytes: 250 },
      [
        { heapUsedBytes: 100, rssBytes: 200, processPeakRssBytes: 250 },
        { heapUsedBytes: 170, rssBytes: 260, processPeakRssBytes: 300 },
        { heapUsedBytes: 140, rssBytes: 240, processPeakRssBytes: 320 }
      ]
    )).toEqual({
      baselineHeapUsedBytes: 100,
      baselineRssBytes: 200,
      sampledPeakHeapUsedBytes: 170,
      sampledPeakHeapDeltaBytes: 70,
      sampledPeakRssBytes: 260,
      sampledPeakRssDeltaBytes: 60,
      processPeakRssBytes: 320,
      processPeakRssDeltaBytes: 70,
      sampleCount: 3
    });
  });
});

describe('catalog benchmark tenant-density projection', () => {
  it('is opt-in and parses one positive surface count', () => {
    expect(parseCatalogTenantProxySurfaces([])).toBeNull();
    expect(parseCatalogTenantProxySurfaces([
      '--tenant-proxy-surfaces', '5'
    ])).toBe(5);
  });

  it.each([
    [['--tenant-proxy-surfaces'], 'requires a value'],
    [['--tenant-proxy-surfaces', '0'], 'positive safe integer'],
    [['--tenant-proxy-surfaces', '1.5'], 'positive integer'],
    [['--tenant-proxy-surfaces', '05'], 'positive integer'],
    [[
      '--tenant-proxy-surfaces', '5',
      '--tenant-proxy-surfaces', '6'
    ], 'may only be specified once']
  ])('rejects malformed tenant proxy arguments %j', (args, message) => {
    expect(() => parseCatalogTenantProxySurfaces(args as string[])).toThrow(
      message as string
    );
  });

  it('projects the 350-instance result across configured old space and peak RSS', () => {
    const density = projectCatalogTenantDensity({
      tenantProxySurfaces: 5,
      configuredOldSpaceMiB: 1024,
      snapshot: {
        instances: 350,
        processPeakRssBytes: 1_100_939_264,
        processPeakRssDeltaBytes: 956_203_008
      }
    });

    expect(density).toMatchObject({
      residentSurfaceInstances: 350,
      fullTenantProxyGroups: 70,
      remainderSurfaceInstances: 0,
      configuredOldSpaceMiB: 1024,
      absolutePeakProcessRssBytes: 1_100_939_264,
      groupsPerConfiguredOldSpaceGiB: 70
    });
    expect(density.groupsPerAbsolutePeakProcessRssGiB).toBeCloseTo(
      68.27073040061909,
      10
    );
    expect(density.groupsPerAbsolutePeakProcessRssGiB).not.toBeCloseTo(
      78.60457146773585,
      10
    );
  });

  it('counts only full proxy groups and records leftover surface instances', () => {
    expect(projectCatalogTenantDensity({
      tenantProxySurfaces: 5,
      configuredOldSpaceMiB: 2048,
      snapshot: {
        instances: 24,
        processPeakRssBytes: 2 ** 30,
        processPeakRssDeltaBytes: 2 ** 29
      }
    })).toEqual({
      residentSurfaceInstances: 24,
      fullTenantProxyGroups: 4,
      remainderSurfaceInstances: 4,
      configuredOldSpaceMiB: 2048,
      absolutePeakProcessRssBytes: 2 ** 30,
      groupsPerConfiguredOldSpaceGiB: 2,
      groupsPerAbsolutePeakProcessRssGiB: 4
    });
  });
});

describe('catalog benchmark crash progress', () => {
  it('atomically replaces one credential-free progress artifact', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cperf-progress-'));
    const resultFile = path.join(directory, 'result.json');
    const snapshot: CatalogMemorySnapshot = {
      instances: 25,
      heapUsedBytes: 100,
      heapDeltaBytes: 50,
      rssBytes: 200,
      rssDeltaBytes: 75,
      externalBytes: 10,
      externalDeltaBytes: 1,
      processPeakRssBytes: 220,
      processPeakRssDeltaBytes: 80,
      postgresBackendRssBytes: null,
      postgresBackendRssDeltaBytes: null,
      postgresBackendHighWaterBytes: null,
      postgresBackendHighWaterDeltaBytes: null
    };
    try {
      writeCatalogProgress(resultFile, {
        version: 1,
        status: 'in-progress',
        mode: 'scoped-required',
        scopedCatalogTypes: 'dependency-closure',
        introspectionClientReleaseMode: 'destroy',
        postgresBackendSamplerMode: 'diagnostic-lower-bound',
        releaseBuildStateAfterValidation: true,
        repetition: 1,
        heapMiB: 1024,
        v8Profile: 'jitless-optimize-for-size',
        nodeOptions: '--max-old-space-size=1024',
        nodeOptionsArgv: ['--max-old-space-size=1024'],
        nodeExecArgv: ['--jitless', '--optimize-for-size', '--expose-gc'],
        effectiveNodeRuntimeFlags: [
          '--max-old-space-size=1024',
          '--jitless',
          '--optimize-for-size',
          '--expose-gc'
        ],
        targetInstances: 500,
        completedInstances: 25,
        configuredCheckpoints: [25, 500],
        completedCheckpoints: [25],
        buildsCompleted: 25,
        canariesCompleted: 50,
        mismatchViolations: 0,
        crossTenantViolations: 0,
        lastSnapshot: snapshot,
        updatedAt: '2026-08-01T00:00:00.000Z'
      });
      const progressFile = catalogProgressPath(resultFile);
      expect(JSON.parse(fs.readFileSync(progressFile, 'utf8'))).toMatchObject({
        status: 'in-progress',
        completedInstances: 25,
        lastSnapshot: { instances: 25 }
      });
      expect(fs.readdirSync(directory)).toEqual(['progress.json']);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
