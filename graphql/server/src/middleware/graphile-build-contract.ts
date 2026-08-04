import { createHash, createHmac, randomBytes } from 'node:crypto';

import type { ComputeConfig, StorageConfig } from '@constructive-io/express-context';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';

import type { DatabaseSettings } from '../types';

type GraphileBuildSettings = Omit<
  NonNullable<ConstructiveOptions['graphile']>,
  | 'realtimeSchema'
  | 'realtimeNotificationMode'
  | 'realtimeNotificationRoleRevalidationMs'
  | 'realtimeCursorPollIntervalMs'
  | 'realtimeCursorHeartbeatIntervalMs'
  | 'trustCallerPresetsInProduction'
>;

// The resident cache is process-local, and its keys are emitted in diagnostics.
// A plain digest of plugin/settings configuration could act as an offline
// verifier for a low-entropy secret captured by a caller preset. Key the digest
// per process so equality remains stable for this cache lifetime without making
// the serialized contract portable or reversible evidence.
const graphileBuildContractHmacKey = randomBytes(32);

export interface GraphileBuildContractV1 {
  version: 1;
  /** Process-local identity for the exact graphile(opts) configuration owner. */
  configurationIdentity: string;
  poolIdentity: string;
  databaseId: string;
  databaseName: string;
  apiId: string;
  schemas: string[];
  roles: {
    authenticated: string;
    anonymous: string;
  };
  pluginSettings: DatabaseSettings | null;
  graphileSettings: GraphileBuildSettings | null;
  computeModules: ComputeConfig['modules'];
  computeBindings: ComputeConfig['bindings'];
  storageModules: StorageConfig['modules'];
  surface: {
    isPublic: boolean;
    enableRealtime: boolean;
    realtimeSchema: string | null;
    realtimeNotificationMode: 'dedicated' | 'shared-exact' | null;
    realtimeListenerPoolIdentity: string | null;
    realtimeNotificationRoleRevalidationMs: number | null;
    realtimeCursorPollIntervalMs: number | null;
    realtimeCursorHeartbeatIntervalMs: number | null;
    graphiql: boolean;
    graphiqlOnGraphQLGET: boolean;
    explain: boolean;
  };
  introspectionMode: 'stock' | 'scoped-required';
  introspectionClientReleaseMode: 'reuse' | 'destroy';
}

export interface CreateGraphileBuildContractInput {
  configurationIdentity: string;
  poolIdentity: string;
  databaseId: string;
  databaseName: string;
  apiId: string;
  schemas: string[];
  authenticatedRole: string;
  anonymousRole: string;
  pluginSettings?: DatabaseSettings;
  graphileSettings?: ConstructiveOptions['graphile'];
  compute?: ComputeConfig;
  storage?: StorageConfig;
  isPublic?: boolean;
  enableRealtime?: boolean;
  /**
   * Physical schema containing realtime cursor functions. It is part of the
   * exact instance identity only when realtime is enabled.
   */
  realtimeSchema?: string;
  realtimeNotificationMode?: 'dedicated' | 'shared-exact';
  /** Opaque digest only; raw listener connection configuration is forbidden. */
  realtimeListenerPoolIdentity?: string;
  realtimeNotificationRoleRevalidationMs?: number;
  realtimeCursorPollIntervalMs?: number;
  realtimeCursorHeartbeatIntervalMs?: number;
  /** Whether this exact build serves the GraphiQL UI. Defaults to the legacy true value. */
  graphiql?: boolean;
  /** Whether GraphQL GET requests serve GraphiQL. Defaults to the legacy false value. */
  graphiqlOnGraphQLGET?: boolean;
  explain?: boolean;
  introspectionMode?: 'stock' | 'scoped-required';
  introspectionClientReleaseMode?: 'reuse' | 'destroy';
}

const graphileBuildSettings = (
  settings: ConstructiveOptions['graphile']
): GraphileBuildSettings | null => {
  if (!settings) return null;
  const normalized = { ...settings };
  // Realtime cursor routing is represented by `surface.realtimeSchema` below.
  // Keeping it here as well would split disabled surfaces on an irrelevant
  // process-wide option and needlessly reduce resident tenant density.
  delete normalized.realtimeSchema;
  delete normalized.realtimeNotificationMode;
  delete normalized.realtimeNotificationRoleRevalidationMs;
  delete normalized.realtimeCursorPollIntervalMs;
  delete normalized.realtimeCursorHeartbeatIntervalMs;
  // Admission policy controls whether startup configuration may enter the
  // process trust boundary; it does not change the admitted Graphile build.
  delete normalized.trustCallerPresetsInProduction;
  return normalized;
};

export const createGraphileBuildContract = (
  input: CreateGraphileBuildContractInput
): GraphileBuildContractV1 => {
  const realtimeNotificationMode = input.enableRealtime
    ? input.realtimeNotificationMode ?? 'dedicated'
    : null;
  if (
    realtimeNotificationMode === 'shared-exact'
    && !input.realtimeListenerPoolIdentity
  ) {
    throw new Error('Shared realtime requires an opaque listener pool identity');
  }
  return {
    version: 1,
    configurationIdentity: input.configurationIdentity,
    poolIdentity: input.poolIdentity,
    databaseId: input.databaseId,
    databaseName: input.databaseName,
    apiId: input.apiId,
    schemas: [...input.schemas],
    roles: {
      authenticated: input.authenticatedRole,
      anonymous: input.anonymousRole
    },
    pluginSettings: input.pluginSettings ?? null,
    graphileSettings: graphileBuildSettings(input.graphileSettings),
    computeModules: input.compute?.modules.map((module) => ({ ...module })) ?? [],
    computeBindings: input.compute?.bindings.map((binding) => ({
      ...binding,
      module: { ...binding.module }
    })) ?? [],
    storageModules: input.storage?.modules.map((module) => ({ ...module })) ?? [],
    surface: {
      isPublic: input.isPublic ?? true,
      enableRealtime: input.enableRealtime ?? false,
      realtimeSchema: input.enableRealtime
        ? input.realtimeSchema ?? 'realtime_public'
        : null,
      realtimeNotificationMode,
      realtimeListenerPoolIdentity:
        realtimeNotificationMode === 'shared-exact'
          ? input.realtimeListenerPoolIdentity ?? null
          : null,
      realtimeNotificationRoleRevalidationMs:
        realtimeNotificationMode === 'shared-exact'
          ? input.realtimeNotificationRoleRevalidationMs ?? 60_000
          : null,
      realtimeCursorPollIntervalMs: input.enableRealtime
        ? input.realtimeCursorPollIntervalMs ?? 5_000
        : null,
      realtimeCursorHeartbeatIntervalMs: input.enableRealtime
        ? input.realtimeCursorHeartbeatIntervalMs ?? 30_000
        : null,
      graphiql: input.graphiql ?? true,
      graphiqlOnGraphQLGET: input.graphiqlOnGraphQLGET ?? false,
      explain: input.explain ?? false
    },
    introspectionMode: input.introspectionMode ?? 'stock',
    introspectionClientReleaseMode: input.introspectionClientReleaseMode ?? 'reuse'
  };
};

let nextReferenceIdentity = 0;
const referenceIdentities = new WeakMap<object, number>();
const symbolIdentities = new Map<symbol, number>();

const referenceIdentity = (value: object): number => {
  let identity = referenceIdentities.get(value);
  if (identity === undefined) {
    identity = ++nextReferenceIdentity;
    referenceIdentities.set(value, identity);
  }
  return identity;
};

const symbolIdentity = (value: symbol): number => {
  let identity = symbolIdentities.get(value);
  if (identity === undefined) {
    identity = ++nextReferenceIdentity;
    symbolIdentities.set(value, identity);
  }
  return identity;
};

const canonicalize = (value: unknown, ancestors = new Set<object>()): unknown => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return { $number: 'NaN' };
    if (value === Number.POSITIVE_INFINITY) return { $number: 'Infinity' };
    if (value === Number.NEGATIVE_INFINITY) return { $number: '-Infinity' };
    if (Object.is(value, -0)) return { $number: '-0' };
    return value;
  }
  if (value === undefined) return { $undefined: true };
  if (typeof value === 'function') {
    return {
      $function: value.name,
      source: createHash('sha256').update(Function.prototype.toString.call(value)).digest('hex'),
      // Function source cannot distinguish closures that captured different
      // tenant/plugin configuration. Cache reuse is process-local, so bind
      // the contract to the exact configured function object as well.
      reference: referenceIdentity(value)
    };
  }
  if (typeof value === 'bigint') return { $bigint: value.toString() };
  if (typeof value === 'symbol') {
    return {
      $symbol: value.description ?? null,
      reference: symbolIdentity(value)
    };
  }
  if (typeof value !== 'object') {
    return { $type: typeof value, value: String(value) };
  }

  if (ancestors.has(value)) {
    throw new Error('Graphile build contract contains a circular value');
  }
  const nextAncestors = new Set(ancestors).add(value);
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item, nextAncestors));
  }
  if (value instanceof Date) return { $date: value.toISOString() };
  if (Buffer.isBuffer(value)) {
    return {
      $buffer: createHash('sha256').update(value).digest('hex'),
      bytes: value.byteLength
    };
  }
  if (value instanceof RegExp) {
    return { $regexp: value.source, flags: value.flags };
  }

  const record = value as Record<string, unknown>;
  const symbolRecord = value as Record<symbol, unknown>;
  const stringProperties = Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, canonicalize(record[key], nextAncestors)])
  );
  const symbolProperties = Object.getOwnPropertySymbols(record)
    .map((key) => ({
      key: symbolIdentity(key),
      description: key.description ?? null,
      value: canonicalize(symbolRecord[key], nextAncestors)
    }))
    .sort((left, right) => left.key - right.key);
  const prototype = Object.getPrototypeOf(record);
  if (prototype === Object.prototype || prototype === null) {
    return symbolProperties.length === 0
      ? stringProperties
      : { $properties: stringProperties, $symbols: symbolProperties };
  }
  // Unknown class instances can hide effective configuration in private
  // fields or accessors. Their exact reference is safer than treating two
  // empty-looking instances as equivalent.
  return {
    $instance: record.constructor?.name ?? null,
    reference: referenceIdentity(record),
    properties: stringProperties,
    symbols: symbolProperties
  };
};

export const hashGraphileBuildContract = (contract: GraphileBuildContractV1): string => {
  const canonical = JSON.stringify(canonicalize(contract));
  return `graphile:v1:${createHmac('sha256', graphileBuildContractHmacKey)
    .update(canonical)
    .digest('hex')}`;
};
