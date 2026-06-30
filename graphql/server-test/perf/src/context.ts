import type { GetConnectionsResult } from '../../src/types';

import {
  CONSTRUCTIVE_SCHEMAS,
  DEFAULT_DATABASE_ID,
  META_SCHEMAS,
  privateServicesHeaders,
  responseHasUnexpectedErrors,
  executeGraphql,
} from './operations';
import type { BenchmarkContext, MatrixCase, PerfRunConfig } from './types';

const constructiveLocalSeedAdapters = (config: PerfRunConfig) => {
  const { seed } = require('../../src') as typeof import('../../src');
  return [seed.pgpm(config.constructiveLocalPath, true)];
};

interface ManagedContext {
  context: BenchmarkContext;
  inUse: boolean;
}

export class BenchmarkContextManager {
  private readonly contexts = new Map<string, ManagedContext>();
  private nextId = 1;
  private envPatched = false;
  private readonly previousEnv = new Map<string, string | undefined>();

  constructor(private readonly config: PerfRunConfig) {}

  compatibilityKeyFor(matrixCase: MatrixCase): string {
    return [
      `routing=${matrixCase.routingMode}`,
      `cache=${matrixCase.cacheMode}`,
      `cacheEnv=${JSON.stringify(this.config.effectiveCacheEnv)}`,
      'seed=constructive-local',
      `memory=${this.config.captureMemory ? 'capture' : 'skip'}`,
    ].join('|');
  }

  async acquire(matrixCase: MatrixCase): Promise<BenchmarkContext> {
    const baseKey = this.compatibilityKeyFor(matrixCase);
    const compatibilityKey = this.config.connectionPolicy === 'per-case'
      ? `${baseKey}|case=${matrixCase.caseId}|seq=${this.nextId}`
      : baseKey;

    const existing = this.config.connectionPolicy === 'reuse' ? this.contexts.get(compatibilityKey) : undefined;
    if (existing) {
      existing.context.reused = true;
      existing.inUse = true;
      return { ...existing.context, reused: true };
    }

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
    this.restoreRuntimeEnv();
  }

  private setPatchedEnv(key: string, value: string | undefined): void {
    if (!this.previousEnv.has(key)) this.previousEnv.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  private patchRuntimeEnv(): void {
    if (this.envPatched) return;
    this.envPatched = true;

    for (const [key, value] of Object.entries(this.config.effectiveCacheEnv)) {
      this.setPatchedEnv(key, value);
    }

    if (this.config.captureMemory) {
      if (process.env.NODE_ENV !== 'development') {
        this.setPatchedEnv('NODE_ENV', 'development');
      }
      if (!process.env.GRAPHQL_OBSERVABILITY_ENABLED) {
        this.setPatchedEnv('GRAPHQL_OBSERVABILITY_ENABLED', 'true');
      }
    }
  }

  private restoreRuntimeEnv(): void {
    if (!this.envPatched) return;
    for (const [key, value] of this.previousEnv.entries()) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    this.previousEnv.clear();
    this.envPatched = false;
  }

  private async createContext(matrixCase: MatrixCase, compatibilityKey: string): Promise<BenchmarkContext> {
    this.patchRuntimeEnv();

    const { createSuperTestAgent, createTestServer, getConnections } = require('../../src') as typeof import('../../src');
    const { getEnvOptions } = require('@constructive-io/graphql-env') as typeof import('@constructive-io/graphql-env');
    const api = {
      enableServicesApi: true,
      isPublic: matrixCase.routingMode === 'public',
      metaSchemas: META_SCHEMAS,
      defaultDatabaseId: DEFAULT_DATABASE_ID,
      useMultiTenancyCache: matrixCase.cacheMode === 'new',
    } as any;

    const conn: GetConnectionsResult = await getConnections(
      {
        schemas: CONSTRUCTIVE_SCHEMAS,
        authRole: 'anonymous',
        server: { api },
      },
      constructiveLocalSeedAdapters(this.config)
    );

    let privateServer: any;
    let privateRequest: any;
    if (matrixCase.routingMode === 'public') {
      privateServer = await createTestServer(
        getEnvOptions({
          pg: conn.pg.config,
          api: {
            enableServicesApi: true,
            isPublic: false,
            metaSchemas: META_SCHEMAS,
            defaultDatabaseId: DEFAULT_DATABASE_ID,
            exposedSchemas: META_SCHEMAS,
            anonRole: 'anonymous',
            roleName: 'anonymous',
            useMultiTenancyCache: matrixCase.cacheMode === 'new',
          } as any,
        })
      );
      privateRequest = createSuperTestAgent(privateServer);
    }

    const id = `ctx-${this.nextId++}`;
    const context: BenchmarkContext = {
      id,
      compatibilityKey,
      reused: false,
      createdAt: new Date().toISOString(),
      serverUrl: conn.server.url,
      graphqlUrl: conn.server.graphqlUrl,
      conn,
      privateServer,
      privateRequest,
      privateServerUrl: privateServer?.url,
    };

    await this.verifyConstructiveLocal(context);
    return context;
  }

  private async verifyConstructiveLocal(context: BenchmarkContext): Promise<void> {
    const response = await executeGraphql(context, {
      query: '{ __typename }',
      headers: privateServicesHeaders(),
      surface: context.privateRequest ? 'private' : undefined,
    });
    if (responseHasUnexpectedErrors(response)) {
      throw new Error(
        `constructive-local baseline did not expose private services GraphQL; ` +
        `status=${response.status}; body=${JSON.stringify(response.body || response.text).slice(0, 1000)}`
      );
    }
  }

  private async teardownContext(key: string): Promise<void> {
    const managed = this.contexts.get(key);
    if (!managed) return;
    this.contexts.delete(key);
    if (managed.context.privateServer) {
      await managed.context.privateServer.stop();
    }
    await managed.context.conn.teardown();
  }
}
