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
} from './types';

const log = new Logger('graphile-bucket-provisioner:plugin');

// --- Storage module queries ---

/**
 * Resolve the storage module whose buckets table is the one being addressed.
 *
 * The buckets table's identity (schema + table, from the codec being mutated or
 * the module row) is the fact that names the plane — never a scope literal.
 */
const STORAGE_MODULE_BY_BUCKETS_TABLE_QUERY = `
  SELECT
    sm.id,
    sm.scope,
    sm.entity_table_id,
    bs.schema_name AS buckets_schema,
    bt.name AS buckets_table,
    sm.endpoint,
    sm.public_url_prefix,
    sm.provider,
    sm.allowed_origins
  FROM metaschema_modules_public.storage_module sm
  JOIN metaschema_public.table bt ON bt.id = sm.buckets_table_id
  JOIN metaschema_public.schema bs ON bs.id = bt.schema_id
  WHERE sm.database_id = $1
    AND bs.schema_name = $2
    AND bt.name = $3
`;

/**
 * Resolve ALL storage modules for a database (for bucket-key and ownerId-based
 * resolution in the explicit provisionBucket mutation).
 */
const ALL_STORAGE_MODULES_QUERY = `
  SELECT
    sm.id,
    sm.scope,
    sm.entity_table_id,
    bs.schema_name AS buckets_schema,
    bt.name AS buckets_table,
    sm.endpoint,
    sm.public_url_prefix,
    sm.provider,
    sm.allowed_origins,
    es.schema_name AS entity_schema,
    et.name AS entity_table
  FROM metaschema_modules_public.storage_module sm
  JOIN metaschema_public.table bt ON bt.id = sm.buckets_table_id
  JOIN metaschema_public.schema bs ON bs.id = bt.schema_id
  LEFT JOIN metaschema_public.table et ON et.id = sm.entity_table_id
  LEFT JOIN metaschema_public.schema es ON es.id = et.schema_id
  WHERE sm.database_id = $1
`;

interface StorageModuleRow {
  id: string;
  scope: string;
  entity_table_id: string | null;
  buckets_schema: string;
  buckets_table: string;
  endpoint: string | null;
  public_url_prefix: string | null;
  provider: string | null;
  allowed_origins: string[] | null;
  entity_schema?: string | null;
  entity_table?: string | null;
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

/**
 * Resolve the storage module whose buckets table is the one being addressed.
 *
 * This is the resolution the auto-provision/CORS hooks use: the codec being
 * mutated names its table, and the table names its module. A `@storageBuckets`
 * table with no module row (or with several) is a provisioning bug and throws.
 */
async function resolveStorageModuleByBucketsTable(
  pgClient: any,
  databaseId: string,
  schemaName: string,
  tableName: string,
): Promise<StorageModuleRow> {
  const result = await runQuery(pgClient, STORAGE_MODULE_BY_BUCKETS_TABLE_QUERY, [
    databaseId,
    schemaName,
    tableName,
  ]);
  const rows = result.rows as StorageModuleRow[];
  if (rows.length === 0) {
    throw new Error(
      `STORAGE_MODULE_NOT_FOUND: no storage module in database ${databaseId} records ` +
      `${schemaName}.${tableName} as its buckets table`,
    );
  }
  if (rows.length > 1) {
    throw new Error(
      `STORAGE_MODULE_AMBIGUOUS: ${rows.length} storage modules in database ${databaseId} record ` +
      `${schemaName}.${tableName} as their buckets table`,
    );
  }
  return rows[0];
}

/**
 * The explicit provisionBucket mutation's resolution: find the plane that
 * actually holds the named bucket row.
 *
 * With an ownerId, the owning entity row names the plane (probed through each
 * entity-keyed module's recorded entity table). Without one, every
 * non-entity-keyed plane's buckets table is probed for the key under RLS —
 * exactly one plane may hold it; several is ambiguous and throws rather than
 * silently picking.
 */
async function resolveBucketByKey(
  pgClient: any,
  databaseId: string,
  bucketKey: string,
  ownerId?: string,
): Promise<{ storageModule: StorageModuleRow; bucket: BucketRow } | null> {
  const result = await runQuery(pgClient, ALL_STORAGE_MODULES_QUERY, [databaseId]);
  const modules = result.rows as StorageModuleRow[];

  if (modules.length === 0) {
    throw new Error(
      `STORAGE_MODULE_NOT_PROVISIONED: database ${databaseId} has no storage modules`,
    );
  }

  if (ownerId) {
    const entityModules = modules.filter((m) => m.entity_table_id !== null && m.entity_schema && m.entity_table);
    for (const mod of entityModules) {
      const entityTable = QuoteUtils.quoteQualifiedIdentifier(mod.entity_schema!, mod.entity_table!);
      const probe = await runQuery(
        pgClient,
        `SELECT 1 FROM ${entityTable} WHERE id = $1 LIMIT 1`,
        [ownerId],
      );
      if (probe.rows.length === 0) continue;

      const bucketsTable = QuoteUtils.quoteQualifiedIdentifier(mod.buckets_schema, mod.buckets_table);
      const bucketResult = await runQuery(
        pgClient,
        `SELECT id, key, type, is_public, allowed_origins, physical_name
         FROM ${bucketsTable}
         WHERE key = $1 AND owner_id = $2
         LIMIT 1`,
        [bucketKey, ownerId],
      );
      if (bucketResult.rows.length === 0) return null;
      return { storageModule: mod, bucket: bucketResult.rows[0] as BucketRow };
    }
    return null;
  }

  const matches: { storageModule: StorageModuleRow; bucket: BucketRow }[] = [];
  for (const mod of modules.filter((m) => m.entity_table_id === null)) {
    const bucketsTable = QuoteUtils.quoteQualifiedIdentifier(mod.buckets_schema, mod.buckets_table);
    const bucketResult = await runQuery(
      pgClient,
      `SELECT id, key, type, is_public, allowed_origins, physical_name
       FROM ${bucketsTable}
       WHERE key = $1
       LIMIT 1`,
      [bucketKey],
    );
    if (bucketResult.rows.length > 0) {
      matches.push({ storageModule: mod, bucket: bucketResult.rows[0] as BucketRow });
    }
  }

  if (matches.length === 0) return null;
  if (matches.length > 1) {
    const scopes = matches.map((m) => `'${m.storageModule.scope}'`).join(', ');
    throw new Error(
      `BUCKET_KEY_AMBIGUOUS: bucket key "${bucketKey}" exists in ${matches.length} storage planes ` +
      `(scopes ${scopes}); provide an ownerId or use a plane-unique key`,
    );
  }
  return matches[0];
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
 * Runs in the system lane (`withPgClient(null, ...)`) — server bookkeeping,
 * RLS-independent. Idempotent via the `physical_name IS NULL` guard so a
 * re-provision never clobbers an already-recorded coordinate.
 */
async function recordPhysicalName(
  withPgClient: (pgSettings: null, cb: (client: any) => Promise<unknown>) => Promise<unknown>,
  bucketsTable: string,
  bucketId: string,
  physicalName: string,
): Promise<void> {
  await withPgClient(null, (client: any) =>
    runQuery(
      client,
      `UPDATE ${bucketsTable} SET physical_name = $1 WHERE id = $2 AND physical_name IS NULL`,
      [physicalName, bucketId],
    ),
  );
  log.info(`Recorded physical_name="${physicalName}" on bucket ${bucketId}`);
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
  storageModuleOrigins: string[] | null | undefined,
  pluginOrigins: string[] | (() => string[]),
): string[] {
  if (bucketOrigins && bucketOrigins.length > 0) {
    return bucketOrigins;
  }
  if (storageModuleOrigins && storageModuleOrigins.length > 0) {
    return storageModuleOrigins;
  }
  return typeof pluginOrigins === 'function' ? pluginOrigins() : pluginOrigins;
}

/**
 * Build a BucketProvisioner with per-database connection overrides.
 */
function buildProvisioner(
  options: BucketProvisionerPluginOptions,
  storageModule: StorageModuleRow | null,
  effectiveOrigins: string[],
): BucketProvisioner {
  const connection = resolveConnection(options);
  const effectiveConnection: StorageConnectionConfig = {
    ...connection,
    ...(storageModule?.endpoint ? { endpoint: storageModule.endpoint } : {}),
    ...(storageModule?.provider
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
  storageModule: StorageModuleRow,
  databaseId: string,
  bucketKey: string,
  bucketType: string,
  bucketAllowedOrigins: string[] | null | undefined,
  options: BucketProvisionerPluginOptions,
  s3BucketName: string,
): Promise<ProvisionResult> {
  const accessType = bucketType as 'public' | 'private' | 'temp';

  // Resolve CORS origins using the 3-tier hierarchy
  const effectiveOrigins = resolveAllowedOrigins(
    bucketAllowedOrigins,
    storageModule?.allowed_origins,
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
    publicUrlPrefix: storageModule?.public_url_prefix ?? undefined,
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
  storageModule: StorageModuleRow,
  databaseId: string,
  bucketKey: string,
  bucketType: string,
  bucketAllowedOrigins: string[] | null | undefined,
  options: BucketProvisionerPluginOptions,
  s3BucketName: string,
): Promise<void> {
  const accessType = bucketType as 'public' | 'private' | 'temp';

  const effectiveOrigins = resolveAllowedOrigins(
    bucketAllowedOrigins,
    storageModule?.allowed_origins,
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

            return withPgClient(pgSettings, async (pgClient: any) => {
              // Resolve database ID from JWT context
              const databaseId = await resolveDatabaseId(pgClient);
              if (!databaseId) {
                throw new Error('DATABASE_NOT_FOUND');
              }

              // Resolve the plane that actually holds the named bucket row
              // (RLS enforced via pgSettings) — never a guessed scope.
              const resolution = await resolveBucketByKey(pgClient, databaseId, bucketKey, ownerId);
              if (!resolution) {
                throw new Error('BUCKET_NOT_FOUND');
              }
              const { storageModule, bucket } = resolution;
              const bucketsTable = QuoteUtils.quoteQualifiedIdentifier(storageModule.buckets_schema, storageModule.buckets_table);

              // First provision mints a name; afterwards the stored coordinate
              // is authoritative and the naming hook is never consulted again.
              const recorded = storedPhysicalName(bucket);
              const s3BucketName = recorded === null
                ? resolveBucketName(bucket.key, databaseId, options)
                : recorded;

              try {
                const result = await provisionBucketForRow(
                  storageModule,
                  databaseId,
                  bucket.key,
                  bucket.type,
                  bucket.allowed_origins,
                  options,
                  s3BucketName,
                );

                // Record the exact provisioned name on the source row.
                await recordPhysicalName(withPgClient, bucketsTable, bucket.id, result.bucketName);

                return {
                  success: true,
                  bucketName: result.bucketName,
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
                  error: err.message,
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

          // The codec being mutated names the buckets table — the hook always
          // operates on the plane that table belongs to, never a guessed scope.
          const codecSchemaName = pgCodec.extensions?.pg?.schemaName as string | undefined;
          const codecTableName = pgCodec.extensions?.pg?.name as string | undefined;

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

                if (!withPgClient) {
                  log.warn(`${isCreate ? 'Auto-provision' : 'CORS update'} skipped: withPgClient not available in context`);
                  return result;
                }

                if (isCreate) {
                  // --- CREATE: full provisioning ---
                  if (!bucketInput?.key || !bucketInput?.type) {
                    log.warn(
                      `Auto-provision skipped for "${fieldName}": ` +
                      `could not extract key/type from mutation input`,
                    );
                    return result;
                  }

                  if (!codecSchemaName || !codecTableName) {
                    throw new Error(
                      `Auto-provision failed for "${fieldName}": codec ${pgCodec.name} carries no pg schema/table identity`,
                    );
                  }

                  await withPgClient(pgSettings, async (pgClient: any) => {
                    const databaseId = await resolveDatabaseId(pgClient);
                    if (!databaseId) {
                      log.warn('Auto-provision skipped: could not resolve database_id');
                      return;
                    }

                    // The mutated table names its module — the plane being written
                    // is the plane that gets provisioned.
                    const storageModule = await resolveStorageModuleByBucketsTable(
                      pgClient, databaseId, codecSchemaName, codecTableName,
                    );

                    // Newly-created row has no stored coordinate yet — mint on first provision.
                    const result = await provisionBucketForRow(
                      storageModule,
                      databaseId,
                      bucketInput.key,
                      bucketInput.type,
                      bucketInput.allowedOrigins ?? bucketInput.allowed_origins ?? null,
                      options,
                      resolveBucketName(bucketInput.key, databaseId, options),
                    );

                    // Record the provisioned name on the just-created row.
                    const bucketsTable = QuoteUtils.quoteQualifiedIdentifier(storageModule.buckets_schema, storageModule.buckets_table);
                    const ownerId = bucketInput.ownerId ?? bucketInput.owner_id ?? null;
                    const idResult = await runQuery(
                      pgClient,
                      ownerId
                        ? `SELECT id FROM ${bucketsTable} WHERE key = $1 AND owner_id = $2 LIMIT 1`
                        : `SELECT id FROM ${bucketsTable} WHERE key = $1 LIMIT 1`,
                      ownerId ? [bucketInput.key, ownerId] : [bucketInput.key],
                    );
                    const bucketId = idResult.rows[0]?.id;
                    if (bucketId) await recordPhysicalName(withPgClient, bucketsTable, bucketId, result.bucketName);
                  });
                } else {
                  // --- UPDATE: re-apply CORS if allowed_origins is in the patch ---
                  const hasOriginsUpdate = bucketInput &&
                    ('allowedOrigins' in bucketInput || 'allowed_origins' in bucketInput);

                  if (!hasOriginsUpdate) {
                    // allowed_origins not being changed, nothing to do
                    return result;
                  }

                  if (!codecSchemaName || !codecTableName) {
                    throw new Error(
                      `CORS update failed for "${fieldName}": codec ${pgCodec.name} carries no pg schema/table identity`,
                    );
                  }

                  await withPgClient(pgSettings, async (pgClient: any) => {
                    const databaseId = await resolveDatabaseId(pgClient);
                    if (!databaseId) {
                      log.warn('CORS update skipped: could not resolve database_id');
                      return;
                    }

                    // The mutated table names its module — CORS applies to the
                    // plane whose row was updated.
                    const storageModule = await resolveStorageModuleByBucketsTable(
                      pgClient, databaseId, codecSchemaName, codecTableName,
                    );

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
                    const bucketsTable = QuoteUtils.quoteQualifiedIdentifier(storageModule.buckets_schema, storageModule.buckets_table);
                    const bucketResult = await runQuery(
                      pgClient,
                      `SELECT id, key, type, is_public, allowed_origins, physical_name
                       FROM ${bucketsTable}
                       WHERE key = $1
                       LIMIT 1`,
                      [patchKey],
                    );

                    if (bucketResult.rows.length === 0) {
                      log.warn(`CORS update skipped: bucket "${patchKey}" not found`);
                      return;
                    }

                    const bucket = bucketResult.rows[0] as BucketRow;

                    // CORS applies to the recorded physical bucket; if the row was
                    // never provisioned there is nothing to update yet, so mint the
                    // conventional name the first provision would use.
                    const recorded = storedPhysicalName(bucket);

                    await updateBucketCors(
                      storageModule,
                      databaseId,
                      bucket.key,
                      bucket.type,
                      bucket.allowed_origins,
                      options,
                      recorded === null
                        ? resolveBucketName(bucket.key, databaseId, options)
                        : recorded,
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
