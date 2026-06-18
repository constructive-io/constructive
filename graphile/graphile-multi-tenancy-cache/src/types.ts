import type { Express } from 'express';
import type { Server as HttpServer } from 'node:http';
import type { Pool } from 'pg';

export interface TenantConfig {
  svcKey: string;
  pool: Pool;
  schemas: string[];
  anonRole: string;
  roleName: string;
  databaseId?: string;
  presetOptions?: unknown;
}

export interface TenantHandlerResources {
  handler: Express;
  httpServer?: HttpServer;
  pgl?: { release(): void | PromiseLike<void> };
  realtimeManager?: { stop(): Promise<void> } | null;
  release?: () => Promise<void>;
}

export interface TenantInstance extends TenantHandlerResources {
  buildKey: string;
  schemas: string[];
  createdAt: number;
  lastUsedAt: number;
}

export interface MultiTenancyCacheStats {
  handlerCacheSize: number;
  handlerCacheMax: number;
  handlerCacheTtlMs: number;
  svcKeyMappings: number;
  databaseIdMappings: number;
  inflightCreations: number;
  buildKeys: string[];
}

export interface BuildKeyParts {
  conn: string;
  schemas: string[];
  anonRole: string;
  roleName: string;
  presetOptions?: unknown;
}

export interface TenantHandlerFactoryContext {
  buildKey: string;
  svcKey: string;
  pool: Pool;
  schemas: string[];
  anonRole: string;
  roleName: string;
  databaseId?: string;
  presetOptions?: unknown;
}

export type TenantHandlerFactory = (
  context: TenantHandlerFactoryContext,
) => Promise<TenantHandlerResources>;

export interface MultiTenancyCacheConfig {
  handlerFactory: TenantHandlerFactory;
}

export interface HandlerCacheConfig {
  max: number;
  ttlMs: number;
}
