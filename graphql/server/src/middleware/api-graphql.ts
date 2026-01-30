/**
 * GraphQL-based API lookup service
 *
 * This module provides GraphQL-based API configuration lookup as an alternative
 * to direct SQL queries. It creates a singleton PostGraphile v5 instance for
 * the services/meta schemas and uses it to resolve tenant configurations.
 *
 * Usage:
 * 1. Initialize the service once at startup with initApiLookupService()
 * 2. Use queryApiByDomainGraphQL() and queryApiByNameGraphQL() for lookups
 * 3. Call releaseApiLookupService() on shutdown
 */
import { Logger } from '@pgpmjs/logger';
import { svcCache } from '@pgpmjs/server-utils';
import type { GraphQLSchema } from 'graphql';
import type { GraphileConfig } from 'graphile-config';
import { GraphileQuery, createGraphileSchema } from 'graphile-query';
import { getGraphilePreset } from 'graphile-settings';
import { getPgEnvOptions } from 'pg-env';

import { ApiStructure, ApiOptions } from '../types';
import {
  createGraphileOrm,
  normalizeApiRecord,
  apiSelect,
  domainSelect,
} from './gql';

const log = new Logger('api-graphql');

/**
 * Singleton state for the meta GraphQL instance
 */
interface ApiLookupServiceState {
  initialized: boolean;
  graphile: GraphileQuery | null;
  release: (() => Promise<void>) | null;
  orm: ReturnType<typeof createGraphileOrm> | null;
}

const state: ApiLookupServiceState = {
  initialized: false,
  graphile: null,
  release: null,
  orm: null,
};

/**
 * Build a connection string from pg config options
 */
const buildConnectionString = (
  user: string,
  password: string,
  host: string,
  port: string | number,
  database: string
): string => `postgres://${user}:${password}@${host}:${port}/${database}`;

/**
 * Initialize the API lookup service
 *
 * Creates a PostGraphile v5 instance for the services/meta schemas.
 * This should be called once at server startup.
 *
 * @param opts - Server options containing pg and api configuration
 * @returns Promise that resolves when initialization is complete
 */
export async function initApiLookupService(opts: ApiOptions): Promise<void> {
  if (state.initialized) {
    log.debug('API lookup service already initialized');
    return;
  }

  const metaSchemas = opts.api?.metaSchemas || [];
  if (metaSchemas.length === 0) {
    log.warn(
      'No metaSchemas configured, API lookup service will not be available'
    );
    return;
  }

  try {
    const pgConfig = getPgEnvOptions(opts.pg);
    const connectionString = buildConnectionString(
      pgConfig.user,
      pgConfig.password,
      pgConfig.host,
      pgConfig.port,
      pgConfig.database
    );

    // Create a minimal preset for the meta schema lookup
    const basePreset = getGraphilePreset(opts);

    log.info(
      `Initializing API lookup service with schemas: ${metaSchemas.join(', ')}`
    );

    const { schema, resolvedPreset, release } = await createGraphileSchema({
      connectionString,
      schemas: metaSchemas,
      preset: basePreset,
    });

    const graphile = new GraphileQuery({ schema, resolvedPreset });
    const orm = createGraphileOrm(graphile);

    state.graphile = graphile;
    state.release = release;
    state.orm = orm;
    state.initialized = true;

    log.info('API lookup service initialized successfully');
  } catch (error) {
    log.error('Failed to initialize API lookup service:', error);
    // Don't throw - allow fallback to SQL queries
  }
}

/**
 * Release resources used by the API lookup service
 *
 * Should be called on server shutdown.
 */
export async function releaseApiLookupService(): Promise<void> {
  if (state.release) {
    await state.release();
    state.graphile = null;
    state.release = null;
    state.orm = null;
    state.initialized = false;
    log.info('API lookup service released');
  }
}

/**
 * Check if the GraphQL lookup service is available
 */
export function isApiLookupServiceAvailable(): boolean {
  return state.initialized && state.orm !== null;
}

/**
 * Query API by domain and subdomain using GraphQL
 *
 * @param opts - API options
 * @param key - Cache key for the service
 * @param domain - Domain to look up
 * @param subdomain - Subdomain to look up (null for root domain)
 * @returns ApiStructure if found, null otherwise
 */
export async function queryApiByDomainGraphQL({
  opts,
  key,
  domain,
  subdomain,
}: {
  opts: ApiOptions;
  key: string;
  domain: string;
  subdomain: string | null;
}): Promise<ApiStructure | null> {
  if (!state.orm) {
    log.debug('GraphQL lookup not available, will use SQL fallback');
    return null;
  }

  const apiPublic = opts.api?.isPublic;

  try {
    // Build the filter for domain lookup
    const domainFilter = {
      domain: { equalTo: domain },
      ...(subdomain
        ? { subdomain: { equalTo: subdomain } }
        : { subdomain: { isNull: true } }),
      api: {
        isPublic: { equalTo: apiPublic },
      },
    };

    const result = await state.orm.domain
      .findFirst({
        select: domainSelect,
        where: domainFilter,
      })
      .execute();

    if (!result.ok || !result.data?.domains?.nodes?.length) {
      return null;
    }

    const domainRecord = result.data.domains.nodes[0];
    if (!domainRecord.api) {
      return null;
    }

    const apiStructure = normalizeApiRecord(domainRecord.api);
    svcCache.set(key, apiStructure);

    log.debug(
      `GraphQL domain lookup successful: ${domain}/${subdomain} -> ${apiStructure.dbname}`
    );

    return apiStructure;
  } catch (error) {
    log.error('GraphQL domain lookup failed:', error);
    return null; // Fall back to SQL
  }
}

/**
 * Query API by database ID and name using GraphQL
 *
 * @param opts - API options
 * @param key - Cache key for the service
 * @param databaseId - Database ID to look up
 * @param name - API name to look up
 * @returns ApiStructure if found, null otherwise
 */
export async function queryApiByNameGraphQL({
  opts,
  key,
  databaseId,
  name,
}: {
  opts: ApiOptions;
  key: string;
  databaseId?: string;
  name: string;
}): Promise<ApiStructure | null> {
  if (!state.orm || !databaseId) {
    log.debug('GraphQL lookup not available or no databaseId, will use SQL fallback');
    return null;
  }

  try {
    const result = await state.orm.query
      .apiByDatabaseIdAndName(
        { databaseId, name },
        { select: apiSelect }
      )
      .execute();

    if (!result.ok || !result.data?.apiByDatabaseIdAndName) {
      return null;
    }

    const apiStructure = normalizeApiRecord(result.data.apiByDatabaseIdAndName);
    svcCache.set(key, apiStructure);

    log.debug(
      `GraphQL API name lookup successful: ${databaseId}/${name} -> ${apiStructure.dbname}`
    );

    return apiStructure;
  } catch (error) {
    log.error('GraphQL API name lookup failed:', error);
    return null; // Fall back to SQL
  }
}
