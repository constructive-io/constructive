/**
 * Bucket Provisioner Plugin for PostGraphile v5
 *
 * Adds S3 bucket provisioning support to PostGraphile v5:
 *
 * 1. `provisionBucket` mutation — explicitly provision an S3 bucket for a
 *    logical bucket row in the database. Reads the bucket config via RLS,
 *    then calls BucketProvisioner to create and configure the S3 bucket.
 *
 * 2. Auto-provisioning hook — wraps `create*` mutations on tables tagged
 *    with `@storageBuckets` to automatically provision the S3 bucket after
 *    the database row is created.
 *
 * 3. CORS update hook — wraps `update*` mutations on `@storageBuckets` tables
 *    to detect changes to `allowed_origins` and re-apply CORS rules to the
 *    S3 bucket.
 *
 * CORS resolution hierarchy (most specific wins):
 *   1. Bucket-level `allowed_origins` column (per-bucket override)
 *   2. Storage-module-level `allowed_origins` column (per-database default)
 *   3. Plugin config `allowedOrigins` (global fallback)
 * Supports `['*']` for open/CDN mode (wildcard CORS).
 *
 * Both pathways use `@constructive-io/bucket-provisioner` for the actual
 * S3 operations (bucket creation, Block Public Access, CORS, policies,
 * versioning, lifecycle rules).
 *
 * Detection: Uses the `@storageBuckets` smart tag on the codec (table).
 * The storage module generator in constructive-db sets this tag on the
 * generated buckets table via a smart comment:
 *   COMMENT ON TABLE buckets IS E'@storageBuckets\nStorage buckets table';
 */

import type { ProvisionResult,StorageConnectionConfig } from '@constructive-io/bucket-provisioner';
import {
  BucketProvisioner,
} from '@constructive-io/bucket-provisioner';
import { Logger } from '@pgpmjs/logger';
import { QuoteUtils } from '@pgsql/quotes';
import { context as grafastContext, lambda, object } from 'grafast';
import type { GraphileConfig } from 'graphile-config';
import { extendSchema, gql } from 'graphile-utils';

import type {
  BucketProvisionerPluginOptions,
  BucketProvisionerStorageModule,
} from './types';

const log = new Logger('graphile-bucket-provisioner:plugin');

const QUALIFIED_IDENTIFIER = /^("(?:[^"]|"")+"|[a-z_][a-z0-9_$]*)\.("(?:[^"]|"")+"|[a-z_][a-z0-9_$]*)$/;

function decodeIdentifier(identifier: string): string {
  return identifier.startsWith('"')
    ? identifier.slice(1, -1).replace(/""/g, '"')
    : identifier;
}

/**
 * Parse exactly two SQL identifiers, then quote both components again. This
 * accepts the canonical quoted names emitted by the control-plane loader but
 * rejects expressions, search paths, comments, and extra qualification.
 */
function quotePreloadedQualifiedIdentifier(value: string, label: string): string {
  const match = QUALIFIED_IDENTIFIER.exec(value);
  if (!match) {
    throw new Error(`STORAGE_MODULE_METADATA_INVALID:${label}`);
  }
  const schema = decodeIdentifier(match[1]);
  const objectName = decodeIdentifier(match[2]);
  if (
    schema.length === 0 ||
    objectName.length === 0 ||
    schema.includes('\0') ||
    objectName.includes('\0') ||
    Buffer.byteLength(schema, 'utf8') > 63 ||
    Buffer.byteLength(objectName, 'utf8') > 63
  ) {
    throw new Error(`STORAGE_MODULE_METADATA_INVALID:${label}`);
  }
  return QuoteUtils.quoteQualifiedIdentifier(schema, objectName);
}

function snapshotStorageModules(
  modules: readonly BucketProvisionerStorageModule[] | undefined,
): readonly BucketProvisionerStorageModule[] | undefined {
  if (modules === undefined) return undefined;

  for (const module of modules) {
    if (
      !module ||
      typeof module.id !== 'string' ||
      module.id.length === 0 ||
      typeof module.scope !== 'string' ||
      module.scope.length === 0 ||
      typeof module.schemaName !== 'string' ||
      module.schemaName.length === 0 ||
      module.schemaName.includes('\0') ||
      Buffer.byteLength(module.schemaName, 'utf8') > 63 ||
      typeof module.bucketsTableName !== 'string' ||
      module.bucketsTableName.length === 0 ||
      module.bucketsTableName.includes('\0') ||
      Buffer.byteLength(module.bucketsTableName, 'utf8') > 63
    ) {
      throw new Error('STORAGE_MODULE_METADATA_INVALID');
    }
    QuoteUtils.quoteQualifiedIdentifier(module.schemaName, module.bucketsTableName);
    if (module.scope === 'app') {
      if (module.entityTableId !== null || module.entityQualifiedName !== null) {
        throw new Error(`STORAGE_MODULE_METADATA_INVALID:${module.id}`);
      }
    } else if (!module.entityTableId || !module.entityQualifiedName) {
      throw new Error(`STORAGE_MODULE_METADATA_INVALID:${module.id}`);
    } else {
      quotePreloadedQualifiedIdentifier(module.entityQualifiedName, `entity:${module.id}`);
    }
  }

  if (
    Object.isFrozen(modules) &&
    modules.every((module) =>
      Object.isFrozen(module) &&
      (module.allowedOrigins === null || Object.isFrozen(module.allowedOrigins)),
    )
  ) {
    return modules;
  }

  return Object.freeze(modules.map((module) => Object.freeze({
    ...module,
    allowedOrigins: module.allowedOrigins === null
      ? null
      : Object.freeze([...module.allowedOrigins]),
  })));
}

/**
 * Run a query against a grafast `withPgClient` client.
 *
 * That client's `query` takes the `{ text, values }` object form (the same
 * shape the presigned-url plugin uses) — NOT node-pg's positional
 * `(text, params)` args, which surface as "A query must have either text or a
 * name" at runtime.
 */
function runQuery(
  pgClient: any,
  text: string,
  values?: unknown[],
): Promise<{ rows: any[] }> {
  return pgClient.query(values === undefined ? { text } : { text, values });
}

function assertStorageRequestContext(withPgClient: unknown, pgSettings: unknown): asserts withPgClient is (
  settings: Record<string, string>,
  callback: (pgClient: any) => Promise<unknown>,
) => Promise<unknown> {
  if (typeof withPgClient !== 'function') {
    throw new Error('STORAGE_CONTEXT_UNAVAILABLE');
  }
  if (typeof pgSettings !== 'object' || pgSettings === null || Array.isArray(pgSettings)) {
    throw new Error('STORAGE_REQUEST_SETTINGS_UNAVAILABLE');
  }
}

/**
 * Resolve the storage module for a given scope.
 * If ownerId is provided, probes entity tables to find the matching module.
 * Otherwise, returns the app-level module.
 */
async function resolveStorageModule(
  pgClient: any,
  modules: readonly BucketProvisionerStorageModule[] | undefined,
  ownerId?: string,
): Promise<BucketProvisionerStorageModule | null> {
  if (modules === undefined) {
    throw new Error('STORAGE_MODULE_SNAPSHOT_REQUIRED');
  }

  if (!ownerId) {
    const appModules = modules.filter((module) => module.scope === 'app');
    if (appModules.length > 1) {
      throw new Error('STORAGE_MODULE_AMBIGUOUS:app');
    }
    return appModules[0] ?? null;
  }

  const entityModules = modules.filter((module) => module.scope !== 'app');
  const matches: BucketProvisionerStorageModule[] = [];

  for (const mod of entityModules) {
    const entityTable = quotePreloadedQualifiedIdentifier(
      mod.entityQualifiedName!,
      `entity:${mod.id}`,
    );
    const probe = await runQuery(
      pgClient,
      `SELECT 1 FROM ${entityTable} WHERE id = $1 LIMIT 1`,
      [ownerId],
    );
    if (probe.rows.length > 0) {
      matches.push(mod);
    }
  }

  if (matches.length > 1) {
    throw new Error('STORAGE_MODULE_AMBIGUOUS:owner');
  }
  return matches[0] ?? null;
}

interface BucketRow {
  id: string;
  key: string;
  type: string;
  is_public: boolean;
  allowed_origins: string[] | null;
  physical_name: string | null;
}

/**
 * Normalize the recorded physical coordinate at the DB boundary.
 *
 * A bucket row either carries a recorded coordinate or it does not; SQL nulls
 * and absent columns both mean "never provisioned". Collapsing them here is
 * the single place that shape is interpreted — callers branch on `string`
 * vs `null` and never coalesce a bucket name into existence.
 */
function storedPhysicalName(row: Pick<BucketRow, 'physical_name'>): string | null {
  return row.physical_name == null ? null : row.physical_name;
}

/**
 * Record the physical S3 bucket name on the source bucket row.
 *
 * Runs on the request's already-scoped client. The write must satisfy the same
 * role, claims, and RLS policies as the bucket read that authorized
 * provisioning; a policy denial fails closed. It is idempotent via the
 * `physical_name IS NULL` guard so a re-provision never clobbers an
 * already-recorded coordinate.
 */
async function recordPhysicalName(
  pgClient: any,
  bucketsTable: string,
  bucketId: string,
  physicalName: string,
): Promise<string> {
  const updated = await runQuery(
    pgClient,
    `UPDATE ${bucketsTable}
     SET physical_name = $1
     WHERE id = $2 AND physical_name IS NULL
     RETURNING physical_name`,
    [physicalName, bucketId],
  );
  const written = updated.rows[0]?.physical_name;
  if (updated.rows.length === 1 && typeof written === 'string') {
    log.info(`Recorded physical_name="${written}" on bucket ${bucketId}`);
    return written;
  }
  if (updated.rows.length > 1) {
    throw new Error('BUCKET_COORDINATE_AMBIGUOUS');
  }

  // Another process may have won the first-provision race. Route to the
  // durable value it recorded; never return a losing candidate.
  const existing = await runQuery(
    pgClient,
    `SELECT physical_name FROM ${bucketsTable} WHERE id = $1 LIMIT 2`,
    [bucketId],
  );
  const authoritative = existing.rows[0]?.physical_name;
  if (existing.rows.length !== 1 || typeof authoritative !== 'string') {
    throw new Error('BUCKET_COORDINATE_WRITE_FAILED');
  }
  return authoritative;
}

// --- Helpers ---

/**
 * Resolve the connection config from the options. If the option is a lazy
 * getter function, call it (and cache the result).
 */
function resolveConnection(
  options: BucketProvisionerPluginOptions,
): StorageConnectionConfig {
  if (typeof options.connection === 'function') {
    const resolved = options.connection();
    // Cache so subsequent calls don't re-evaluate
    options.connection = resolved;
    return resolved;
  }
  return options.connection;
}

/**
 * Resolve the S3 bucket name from a logical bucket key.
 */
function resolveBucketName(
  bucketKey: string,
  databaseId: string,
  options: BucketProvisionerPluginOptions,
): string {
  if (options.resolveBucketName) {
    return options.resolveBucketName(bucketKey, databaseId);
  }
  if (options.bucketNamePrefix) {
    return `${options.bucketNamePrefix}-${bucketKey}`;
  }
  return bucketKey;
}

/**
 * Resolve the database_id from the JWT context.
 */
async function resolveDatabaseId(pgClient: any): Promise<string | null> {
  const result = await runQuery(
    pgClient,
    `SELECT jwt_private.current_database_id() AS id`,
  );
  return result.rows[0]?.id ?? null;
}

/**
 * Resolve the effective CORS allowed origins using the 3-tier hierarchy:
 *   1. Bucket-level allowed_origins (per-bucket override)
 *   2. Storage-module-level allowed_origins (per-database default)
 *   3. Plugin config allowedOrigins (global fallback)
 */
function resolveAllowedOrigins(
  bucketOrigins: string[] | null | undefined,
  storageModuleOrigins: readonly string[] | null | undefined,
  pluginOrigins: string[],
): string[] {
  if (bucketOrigins && bucketOrigins.length > 0) {
    return [...bucketOrigins];
  }
  if (storageModuleOrigins && storageModuleOrigins.length > 0) {
    return [...storageModuleOrigins];
  }
  return [...pluginOrigins];
}

/**
 * Build a BucketProvisioner with per-database connection overrides.
 */
function buildProvisioner(
  options: BucketProvisionerPluginOptions,
  storageModule: BucketProvisionerStorageModule,
  effectiveOrigins: string[],
): BucketProvisioner {
  const connection = resolveConnection(options);
  const effectiveConnection: StorageConnectionConfig = {
    ...connection,
    ...(storageModule.endpoint ? { endpoint: storageModule.endpoint } : {}),
    ...(storageModule.provider
      ? { provider: storageModule.provider as StorageConnectionConfig['provider'] }
      : {}),
  };

  return new BucketProvisioner({
    connection: effectiveConnection,
    allowedOrigins: effectiveOrigins,
  });
}

/**
 * Core provisioning logic shared by both the explicit mutation and the
 * auto-provisioning hook.
 */
async function provisionBucketForRow(
  databaseId: string,
  bucketKey: string,
  bucketType: string,
  bucketAllowedOrigins: string[] | null | undefined,
  options: BucketProvisionerPluginOptions,
  s3BucketName: string,
  storageModule: BucketProvisionerStorageModule,
): Promise<ProvisionResult> {
  const accessType = bucketType as 'public' | 'private' | 'temp';

  // Resolve CORS origins using the 3-tier hierarchy
  const effectiveOrigins = resolveAllowedOrigins(
    bucketAllowedOrigins,
    storageModule.allowedOrigins,
    options.allowedOrigins,
  );

  const provisioner = buildProvisioner(options, storageModule, effectiveOrigins);

  log.info(
    `Provisioning S3 bucket "${s3BucketName}" (key="${bucketKey}", type="${accessType}", ` +
    `origins=${JSON.stringify(effectiveOrigins)}) for database ${databaseId}`,
  );

  const result = await provisioner.provision({
    bucketName: s3BucketName,
    accessType,
    versioning: options.versioning ?? false,
    publicUrlPrefix: storageModule.publicUrlPrefix ?? undefined,
    allowedOrigins: effectiveOrigins,
  });

  log.info(
    `Successfully provisioned S3 bucket "${s3BucketName}" ` +
    `(provider=${result.provider}, blockPublicAccess=${result.blockPublicAccess})`,
  );

  return result;
}

/**
 * Update CORS on an existing S3 bucket when allowed_origins changes.
 */
async function updateBucketCors(
  databaseId: string,
  bucketKey: string,
  bucketType: string,
  bucketAllowedOrigins: string[] | null | undefined,
  options: BucketProvisionerPluginOptions,
  s3BucketName: string,
  storageModule: BucketProvisionerStorageModule,
): Promise<void> {
  const accessType = bucketType as 'public' | 'private' | 'temp';

  const effectiveOrigins = resolveAllowedOrigins(
    bucketAllowedOrigins,
    storageModule.allowedOrigins,
    options.allowedOrigins,
  );

  const provisioner = buildProvisioner(options, storageModule, effectiveOrigins);

  log.info(
    `Updating CORS on S3 bucket "${s3BucketName}" ` +
    `(origins=${JSON.stringify(effectiveOrigins)}) for database ${databaseId}`,
  );

  await provisioner.updateCors({
    bucketName: s3BucketName,
    accessType,
    allowedOrigins: effectiveOrigins,
  });

  log.info(`Successfully updated CORS on S3 bucket "${s3BucketName}"`);
}

// --- Plugin factory ---

/**
 * Creates the bucket provisioner plugin.
 *
 * This plugin provides two provisioning pathways:
 *
 * 1. **Explicit `provisionBucket` mutation** — Call this mutation with a
 *    bucket key to provision (or re-provision) the S3 bucket. Protected
 *    by RLS on the buckets table.
 *
 * 2. **Auto-provisioning hook** — When `autoProvision` is true (default),
 *    wraps `create*` mutation resolvers on tables tagged with `@storageBuckets`
 *    to automatically provision the S3 bucket after the row is created.
 *
 * @param options - Plugin configuration (S3 credentials, CORS origins, naming)
 */
export function createBucketProvisionerPlugin(
  options: BucketProvisionerPluginOptions,
): GraphileConfig.Plugin {
  const autoProvision = options.autoProvision ?? true;
  const preloadedStorageModules = snapshotStorageModules(
    options.preloadedStorageModules,
  );

  // The extendSchema plugin adds the explicit provisionBucket mutation
  const mutationPlugin = extendSchema(() => ({
    typeDefs: gql`
      input ProvisionBucketInput {
        """The logical bucket key (e.g., "public", "private")"""
        bucketKey: String!
        """
        Owner entity ID for entity-scoped bucket provisioning.
        Omit for app-level (database-wide) storage.
        """
        ownerId: UUID
      }

      type ProvisionBucketPayload {
        """Whether provisioning succeeded"""
        success: Boolean!
        """The S3 bucket name that was provisioned"""
        bucketName: String!
        """The access type applied"""
        accessType: String!
        """The storage provider used"""
        provider: String!
        """The S3 endpoint (null for AWS S3 default)"""
        endpoint: String
        """Error message if provisioning failed"""
        error: String
      }

      extend type Mutation {
        """
        Provision an S3 bucket for a logical bucket in the database.
        Reads the bucket config via RLS, then creates and configures
        the S3 bucket with the appropriate privacy policies, CORS rules,
        and lifecycle settings.
        """
        provisionBucket(
          input: ProvisionBucketInput!
        ): ProvisionBucketPayload
      }
    `,
    plans: {
      Mutation: {
        provisionBucket(_$mutation: any, fieldArgs: any) {
          const $input = fieldArgs.getRaw('input');
          const $withPgClient = (grafastContext() as any).get('withPgClient');
          const $pgSettings = (grafastContext() as any).get('pgSettings');
          const $combined = object({
            input: $input,
            withPgClient: $withPgClient,
            pgSettings: $pgSettings,
          });

          return lambda($combined, async ({ input, withPgClient, pgSettings }: any) => {
            const { bucketKey, ownerId } = input;

            if (!bucketKey || typeof bucketKey !== 'string') {
              throw new Error('INVALID_BUCKET_KEY');
            }

            assertStorageRequestContext(withPgClient, pgSettings);

            return withPgClient(pgSettings, async (pgClient: any) => {
              // Resolve database ID from JWT context
              const databaseId = await resolveDatabaseId(pgClient);
              if (!databaseId) {
                throw new Error('DATABASE_NOT_FOUND');
              }

              // Resolve storage module (app-level or entity-scoped via ownerId)
              const storageModule = await resolveStorageModule(
                pgClient,
                preloadedStorageModules,
                ownerId,
              );
              if (!storageModule) {
                throw new Error(
                  ownerId
                    ? 'STORAGE_MODULE_NOT_FOUND_FOR_OWNER: no storage module found for the given ownerId'
                    : 'STORAGE_MODULE_NOT_PROVISIONED',
                );
              }

              // Look up the bucket row (RLS enforced via pgSettings)
              const hasOwner = ownerId && storageModule.scope !== 'app';
              const bucketsTable = QuoteUtils.quoteQualifiedIdentifier(
                storageModule.schemaName,
                storageModule.bucketsTableName,
              );
              const bucketResult = await runQuery(
                pgClient,
                hasOwner
                  ? `SELECT id, key, type, is_public, allowed_origins, physical_name
                     FROM ${bucketsTable}
                     WHERE key = $1 AND owner_id = $2
                     LIMIT 2`
                  : `SELECT id, key, type, is_public, allowed_origins, physical_name
                     FROM ${bucketsTable}
                     WHERE key = $1
                     LIMIT 2`,
                hasOwner ? [bucketKey, ownerId] : [bucketKey],
              );

              if (bucketResult.rows.length === 0) {
                throw new Error('BUCKET_NOT_FOUND');
              }
              if (bucketResult.rows.length > 1) {
                throw new Error('BUCKET_AMBIGUOUS');
              }

              const bucket = bucketResult.rows[0] as BucketRow;

              // First provision mints a name; afterwards the stored coordinate
              // is authoritative and the naming hook is never consulted again.
              const recorded = storedPhysicalName(bucket);
              const s3BucketName = recorded === null
                ? resolveBucketName(bucket.key, databaseId, options)
                : recorded;

              try {
                const result = await provisionBucketForRow(
                  databaseId,
                  bucket.key,
                  bucket.type,
                  bucket.allowed_origins,
                  options,
                  s3BucketName,
                  storageModule,
                );

                // Record the exact provisioned name on the source row.
                const authoritativeBucketName = await recordPhysicalName(
                  pgClient,
                  bucketsTable,
                  bucket.id,
                  result.bucketName,
                );

                return {
                  success: true,
                  bucketName: authoritativeBucketName,
                  accessType: result.accessType,
                  provider: result.provider,
                  endpoint: result.endpoint,
                  error: null,
                };
              } catch (err: any) {
                log.error(`Failed to provision bucket "${bucketKey}": ${err.message}`);
                return {
                  success: false,
                  bucketName: s3BucketName,
                  accessType: bucket.type,
                  provider: resolveConnection(options).provider,
                  endpoint: resolveConnection(options).endpoint ?? null,
                  error: 'BUCKET_PROVISIONING_FAILED',
                };
              }
            });
          });
        },
      },
    },
  }));

  // If autoProvision is disabled, return only the mutation plugin
  if (!autoProvision) {
    return mutationPlugin;
  }

  // Build a composite plugin that includes both the mutation and the hook
  return {
    ...mutationPlugin,
    name: 'BucketProvisionerPlugin',
    version: '0.1.0',
    description:
      'Auto-provisions S3 buckets when bucket rows are created, ' +
      'updates CORS when allowed_origins changes on update, ' +
      'and provides a provisionBucket mutation for explicit provisioning',
    after: ['PgAttributesPlugin', 'PgMutationCreatePlugin', 'PgMutationUpdateDeletePlugin'],

    schema: {
      ...mutationPlugin.schema,
      hooks: {
        ...((mutationPlugin.schema as any)?.hooks ?? {}),

        /**
         * Wrap create and update mutation resolvers on tables tagged with @storageBuckets.
         *
         * - create*: After the row is created, provision the S3 bucket.
         * - update*: After the row is updated, re-apply CORS if allowed_origins changed.
         *
         * If provisioning/CORS update fails, the DB row still exists (the mutation
         * already committed), and the error is logged. Admin can retry via provisionBucket.
         */
        GraphQLObjectType_fields_field(field: any, build: any, context: any) {
          const {
            scope: { isRootMutation, fieldName, pgCodec },
          } = context;

          // Only wrap root mutation fields
          if (!isRootMutation || !pgCodec || !pgCodec.attributes) {
            return field;
          }

          // Check for @storageBuckets smart tag
          const tags = pgCodec.extensions?.tags;
          if (!tags?.storageBuckets) {
            return field;
          }

          const isCreate = fieldName.startsWith('create');
          const isUpdate = fieldName.startsWith('update');

          // Only wrap create and update mutations (not delete)
          if (!isCreate && !isUpdate) {
            return field;
          }

          log.debug(`Wrapping mutation "${fieldName}" for ${isCreate ? 'auto-provisioning' : 'CORS update'} (codec: ${pgCodec.name})`);

          const defaultResolver = (obj: any) => obj[fieldName];
          const { resolve: oldResolve = defaultResolver, ...rest } = field;

          return {
            ...rest,
            async resolve(source: any, args: any, graphqlContext: any, info: any) {
              // Call the original resolver first (creates/updates the DB row)
              const result = await oldResolve(source, args, graphqlContext, info);

              try {
                const inputKey = Object.keys(args.input || {}).find(
                  (k) => k !== 'clientMutationId',
                );
                const bucketInput = inputKey ? args.input[inputKey] : null;

                const withPgClient = graphqlContext.withPgClient;
                const pgSettings = graphqlContext.pgSettings;

                assertStorageRequestContext(withPgClient, pgSettings);

                if (isCreate) {
                  // --- CREATE: full provisioning ---
                  if (!bucketInput?.key || !bucketInput?.type) {
                    log.warn(
                      `Auto-provision skipped for "${fieldName}": ` +
                      `could not extract key/type from mutation input`,
                    );
                    return result;
                  }

                  await withPgClient(pgSettings, async (pgClient: any) => {
                    const databaseId = await resolveDatabaseId(pgClient);
                    if (!databaseId) {
                      log.warn('Auto-provision skipped: could not resolve database_id');
                      return;
                    }

                    // Newly-created row has no stored coordinate yet — mint on first provision.
                    const storageModule = await resolveStorageModule(
                      pgClient,
                      preloadedStorageModules,
                    );
                    if (!storageModule) {
                      throw new Error('STORAGE_MODULE_NOT_PROVISIONED');
                    }

                    const result = await provisionBucketForRow(
                      databaseId,
                      bucketInput.key,
                      bucketInput.type,
                      bucketInput.allowedOrigins ?? bucketInput.allowed_origins ?? null,
                      options,
                      resolveBucketName(bucketInput.key, databaseId, options),
                      storageModule,
                    );

                    // Record the provisioned name on the just-created row.
                    const bucketsTable = QuoteUtils.quoteQualifiedIdentifier(
                      storageModule.schemaName,
                      storageModule.bucketsTableName,
                    );
                    const idResult = await runQuery(
                      pgClient,
                      `SELECT id FROM ${bucketsTable} WHERE key = $1 LIMIT 2`,
                      [bucketInput.key],
                    );
                    if (idResult.rows.length !== 1) {
                      throw new Error(
                        idResult.rows.length === 0
                          ? 'BUCKET_NOT_FOUND'
                          : 'BUCKET_AMBIGUOUS',
                      );
                    }
                    const bucketId = idResult.rows[0]?.id;
                    if (bucketId) {
                      await recordPhysicalName(
                        pgClient,
                        bucketsTable,
                        bucketId,
                        result.bucketName,
                      );
                    }
                  });
                } else {
                  // --- UPDATE: re-apply CORS if allowed_origins is in the patch ---
                  const hasOriginsUpdate = bucketInput &&
                    ('allowedOrigins' in bucketInput || 'allowed_origins' in bucketInput);

                  if (!hasOriginsUpdate) {
                    // allowed_origins not being changed, nothing to do
                    return result;
                  }

                  await withPgClient(pgSettings, async (pgClient: any) => {
                    const databaseId = await resolveDatabaseId(pgClient);
                    if (!databaseId) {
                      log.warn('CORS update skipped: could not resolve database_id');
                      return;
                    }

                    // Read the storage module config (app-level; auto-hook doesn't have ownerId context)
                    const storageModule = await resolveStorageModule(
                      pgClient,
                      preloadedStorageModules,
                    );
                    if (!storageModule) {
                      log.warn('CORS update skipped: storage module not provisioned');
                      return;
                    }

                    // We need the bucket key — it may come from input or patch
                    // For updates, PostGraphile uses nodeId or the row's PK, so
                    // we read the bucket from the patch's key or from the nodeId
                    const patchKey = bucketInput?.key;
                    if (!patchKey) {
                      log.warn(
                        `CORS update skipped for "${fieldName}": ` +
                        `could not determine bucket key from mutation input`,
                      );
                      return;
                    }

                    // Read the full bucket row (post-update) to get type + origins
                    const bucketsTable = QuoteUtils.quoteQualifiedIdentifier(
                      storageModule.schemaName,
                      storageModule.bucketsTableName,
                    );
                    const bucketResult = await runQuery(
                      pgClient,
                      `SELECT id, key, type, is_public, allowed_origins, physical_name
                       FROM ${bucketsTable}
                       WHERE key = $1
                       LIMIT 2`,
                      [patchKey],
                    );

                    if (bucketResult.rows.length === 0) {
                      log.warn(`CORS update skipped: bucket "${patchKey}" not found`);
                      return;
                    }
                    if (bucketResult.rows.length > 1) {
                      throw new Error('BUCKET_AMBIGUOUS');
                    }

                    const bucket = bucketResult.rows[0] as BucketRow;

                    // CORS applies to the recorded physical bucket; if the row was
                    // never provisioned there is nothing to update yet, so mint the
                    // conventional name the first provision would use.
                    const recorded = storedPhysicalName(bucket);

                    await updateBucketCors(
                      databaseId,
                      bucket.key,
                      bucket.type,
                      bucket.allowed_origins,
                      options,
                      recorded === null
                        ? resolveBucketName(bucket.key, databaseId, options)
                        : recorded,
                      storageModule,
                    );
                  });
                }
              } catch (err: any) {
                log.error(
                  `${isCreate ? 'Auto-provision' : 'CORS update'} failed for "${fieldName}": ${err.message}. ` +
                  (isCreate
                    ? `The bucket row was created but the S3 bucket was not provisioned. Use the provisionBucket mutation to retry.`
                    : `The bucket row was updated but CORS was not applied to the S3 bucket. Use the provisionBucket mutation to retry.`),
                );
              }

              return result;
            },
          };
        },
      },
    },
  };
}

export const BucketProvisionerPlugin = createBucketProvisionerPlugin;
export default BucketProvisionerPlugin;
