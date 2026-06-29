import path from 'path';

import type { GetConnectionsResult } from '../../src/types';

import { DEFAULT_DATABASE_ID, META_SCHEMAS, SIMPLE_PETS_SCHEMAS } from './operations';
import type { BenchmarkContext, MatrixCase, PerfRunConfig } from './types';

const seedRoot = path.join(__dirname, '..', '..', '..', '..', '__fixtures__', 'seed');
const shared = (...segments: string[]) => path.join(seedRoot, ...segments);

const servicesSeedAdapters = () => {
  const { seed } = require('../../src') as typeof import('../../src');
  return [
    seed.sqlfile([
      shared('services', 'setup.sql'),
      shared('app-schemas', 'simple-pets', 'schema.sql'),
      shared('services', 'test-data.sql'),
      shared('app-schemas', 'simple-pets', 'test-data.sql'),
    ]),
  ];
};

interface ManagedContext {
  context: BenchmarkContext;
  inUse: boolean;
}

export class BenchmarkContextManager {
  private readonly contexts = new Map<string, ManagedContext>();
  private nextId = 1;
  private envPatched = false;
  private previousNodeEnv: string | undefined;
  private previousObservability: string | undefined;

  constructor(private readonly config: PerfRunConfig) {}

  compatibilityKeyFor(matrixCase: MatrixCase): string {
    return [
      `routing=${matrixCase.routingMode}`,
      `cache=${matrixCase.cacheMode}`,
      'seed=simple-pets-services',
      `memory=${this.config.captureMemory ? 'capture' : 'skip'}`,
    ].join('|');
  }

  async acquire(matrixCase: MatrixCase): Promise<BenchmarkContext> {
    const compatibilityKey = this.config.connectionPolicy === 'per-case'
      ? `${this.compatibilityKeyFor(matrixCase)}|case=${matrixCase.caseId}|seq=${this.nextId}`
      : this.compatibilityKeyFor(matrixCase);

    const existing = this.config.connectionPolicy === 'reuse' ? this.contexts.get(compatibilityKey) : undefined;
    if (existing) {
      existing.context.reused = true;
      existing.inUse = true;
      return { ...existing.context, reused: true };
    }

    // Server-level settings such as public/private routing and old/new cache mode
    // are process-global enough that keeping incompatible contexts alive together
    // can leak service/cache entries across cases. Reuse compatible contexts, but
    // tear down incompatible ones before starting a fresh getConnections() server.
    for (const key of [...this.contexts.keys()]) {
      if (key !== compatibilityKey) {
        await this.teardownContext(key);
      }
    }

    const context = await this.createContext(matrixCase, compatibilityKey);
    this.contexts.set(compatibilityKey, { context, inUse: true });
    return context;
  }

  async releaseCase(context: BenchmarkContext): Promise<void> {
    const managed = this.contexts.get(context.compatibilityKey);
    if (managed) managed.inUse = false;
    if (this.config.connectionPolicy === 'per-case') {
      await this.teardownContext(context.compatibilityKey);
    }
  }

  async teardownAll(): Promise<void> {
    const keys = [...this.contexts.keys()];
    for (const key of keys) {
      await this.teardownContext(key);
    }
    this.restoreObservabilityEnv();
  }

  private patchObservabilityEnv(): void {
    if (!this.config.captureMemory || this.envPatched) return;
    this.envPatched = true;
    this.previousNodeEnv = process.env.NODE_ENV;
    this.previousObservability = process.env.GRAPHQL_OBSERVABILITY_ENABLED;

    if (process.env.NODE_ENV !== 'development') {
      process.env.NODE_ENV = 'development';
    }
    if (!process.env.GRAPHQL_OBSERVABILITY_ENABLED) {
      process.env.GRAPHQL_OBSERVABILITY_ENABLED = 'true';
    }
  }

  private restoreObservabilityEnv(): void {
    if (!this.envPatched) return;
    if (this.previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = this.previousNodeEnv;

    if (this.previousObservability === undefined) delete process.env.GRAPHQL_OBSERVABILITY_ENABLED;
    else process.env.GRAPHQL_OBSERVABILITY_ENABLED = this.previousObservability;
    this.envPatched = false;
  }

  private async createContext(matrixCase: MatrixCase, compatibilityKey: string): Promise<BenchmarkContext> {
    this.patchObservabilityEnv();

    const { getConnections } = require('../../src') as typeof import('../../src');
    const conn: GetConnectionsResult = await getConnections(
      {
        schemas: SIMPLE_PETS_SCHEMAS,
        authRole: 'anonymous',
        server: {
          api: {
            enableServicesApi: true,
            isPublic: matrixCase.routingMode === 'public',
            metaSchemas: META_SCHEMAS,
            defaultDatabaseId: DEFAULT_DATABASE_ID,
            useMultiTenancyCache: matrixCase.cacheMode === 'new',
          } as any,
        },
      },
      servicesSeedAdapters()
    );

    const id = `ctx-${this.nextId++}`;
    return {
      id,
      compatibilityKey,
      reused: false,
      createdAt: new Date().toISOString(),
      serverUrl: conn.server.url,
      graphqlUrl: conn.server.graphqlUrl,
      conn,
    };
  }

  private async teardownContext(key: string): Promise<void> {
    const managed = this.contexts.get(key);
    if (!managed) return;
    this.contexts.delete(key);
    await managed.context.conn.teardown();
  }
}
