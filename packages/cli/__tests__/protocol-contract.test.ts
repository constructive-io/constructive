import { createHash } from 'node:crypto';

import {
  CommandCatalogEntrySchema,
  CommandSchemaDocumentSchema,
  DomainProtocolEventSchema,
  ExecutionOutcomeSchema,
  HelpDocumentSchema,
  OperationCancelledEventSchema,
  OperationCompletedEventSchema,
  OperationFailedEventSchema,
  OperationResultSchema,
  OperationStartedEventSchema,
  PROTOCOL_VERSION,
  ProtocolEventSchema,
  SafetyCapabilitiesSchema,
  StructuredErrorSchema,
  TerminalProtocolEventSchema,
  exitCodeForOutcome,
} from '@constructive-io/cli-runtime';

import cliPackage from '../package.json';
import runtimePackage from '../../cli-runtime/package.json';
import { createCncRegistry } from '../src/runtime/registry';
import { ConfigStore } from '../src/config';

const BASELINE = {
  cliMajor: 7,
  runtimeMajor: 0,
  protocolVersion: 'constructive.dev/cli/v1',
  protocolHash:
    'e8db669f49990542560beb4505ab42b4c57c78efc1af1e1678f536c1e955901f',
  exitCodes: {
    completed: 0,
    knownFailure: 1,
    invalidInvocation: 2,
    internalFailure: 70,
    cancellation: 130,
  },
  commandHashes: {
    'auth.logout':
      '69b445d37b72cd6dbd636e2babb345409391baa33686c3de05a5f896506c7f23',
    'auth.set-token':
      '21dfc8df3d854a9dd3da739b4a6904c43c96c73d6b194abe598c244ddf9b23f8',
    'auth.status':
      'c5e0b8ffecb5c44e87f4e2392067d66c131ddfb6cc86c37f693ba49bf03666d7',
    'codegen.generate':
      '00b23b8ad9e92d90bbe41c17657364fd60bf17a3ff36b9ecde3622642506c423',
    'context.create':
      'e52ed662d5e81533272f5bdb5ea7b1f0ea7b9d89810544e54d5d9673833c9233',
    'context.current':
      '99bdb595ce6af4a297e29f31e3a5263b24702d18f938591cff17152229d30d4d',
    'context.delete':
      '5f5e66d67d1b64fb6b577522089f4d36c703b2a21bc9484af048730b8a309d4f',
    'context.list':
      '6ef59b47b7bae7f4594a355eb69c0757162fc4d66c3c80b48af6052fc52423e8',
    'context.use':
      '54d40cfb4f76db466d4f03ab26402988585c2b893481012c20e444f462e2c808',
    'discovery.commands':
      '7c0f8e375cb7e82ba3ec7abf205ac2b962019b1462fee9878fb803ecb38a8edb',
    'discovery.completion':
      'e553b4002c402272ae1a387f3e784e81ecc27529606b1479e8f34667b786050c',
    'discovery.docs-export':
      '22c6a788fceab502ff74408b679555735f660a4cfbe0ce9579d7027af6db3575',
    'discovery.help':
      '50cea8aa90dc6d29d5b9d9813e428e6a0f88f574f14b0935128c91f8cf8099de',
    'discovery.schema':
      'a352530f5b31265975961b75aa237c1b4b7af89e34e312102ee3dacefbeca1bc',
    'discovery.version':
      '810e85542ae045f5cfc491ea2a52390c9e6ae9653f9112cde3c28f71ae0ab3a5',
    execute: 'c2f14d732c26a9010ce8cc29a338e0be06c92f923d5e56e3404d22c2b9ac7fac',
    'explorer.start':
      'dcceb7ea5a663ce38fffaf258718c19c6d3b2fa6fe988ecf0ac05d4a563fb58f',
    'jobs.up':
      'e62ae1024860528a54f0c7b9722aae1e60a908abd9a25bd37aafe44e876c70b6',
    'server.start':
      '11dfbd5913db5f2c226e0e68a2283392dacf3ad2a4b4847f4fd9a4e5d0b0758f',
  },
} as const;

const hash = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

const major = (version: string): number => Number(version.split('.')[0]);

const protocolHash = (): string =>
  hash({
    safetyCapabilities: SafetyCapabilitiesSchema,
    commandCatalogEntry: CommandCatalogEntrySchema,
    commandSchemaDocument: CommandSchemaDocumentSchema,
    helpDocument: HelpDocumentSchema,
    operationResult: OperationResultSchema,
    structuredError: StructuredErrorSchema,
    started: OperationStartedEventSchema,
    domain: DomainProtocolEventSchema,
    completed: OperationCompletedEventSchema,
    failed: OperationFailedEventSchema,
    cancelled: OperationCancelledEventSchema,
    terminal: TerminalProtocolEventSchema,
    protocolEvent: ProtocolEventSchema,
    outcome: ExecutionOutcomeSchema,
  });

const exitCodes = () => ({
  completed: exitCodeForOutcome({ status: 'completed' } as never),
  knownFailure: exitCodeForOutcome({
    status: 'failed',
    error: { category: 'operation' },
  } as never),
  invalidInvocation: exitCodeForOutcome({
    status: 'failed',
    error: { category: 'invocation' },
  } as never),
  internalFailure: exitCodeForOutcome({
    status: 'failed',
    error: { category: 'internal' },
  } as never),
  cancellation: exitCodeForOutcome({ status: 'cancelled' } as never),
});

describe('constructive.dev/cli/v1 compatibility gate', () => {
  it('requires a protocol or package major bump for breaking wire changes', () => {
    const { registry } = createCncRegistry({
      version: cliPackage.version,
      store: new ConfigStore({
        configDir: `${__dirname}/unused-contract-state`,
      }),
    });
    const currentCommands = new Map(
      registry
        .list()
        .map((command) => [command.id, hash(registry.schema(command.id))])
    );
    const breakingChanges: string[] = [];

    for (const [commandId, baselineHash] of Object.entries(
      BASELINE.commandHashes
    )) {
      const currentHash = currentCommands.get(commandId);
      if (currentHash === undefined)
        breakingChanges.push(`removed command ${commandId}`);
      else if (currentHash !== baselineHash)
        breakingChanges.push(`changed command schema ${commandId}`);
    }
    if (protocolHash() !== BASELINE.protocolHash)
      breakingChanges.push('changed protocol envelope schema');
    if (JSON.stringify(exitCodes()) !== JSON.stringify(BASELINE.exitCodes))
      breakingChanges.push('changed exit-code semantics');

    if (breakingChanges.length === 0) return;

    const compatibilityVersionAdvanced =
      PROTOCOL_VERSION !== BASELINE.protocolVersion ||
      major(cliPackage.version) > BASELINE.cliMajor ||
      major(runtimePackage.version) > BASELINE.runtimeMajor;
    expect({ breakingChanges, compatibilityVersionAdvanced }).toEqual({
      breakingChanges,
      compatibilityVersionAdvanced: true,
    });
  });
});
