/**
 * Bucket Provisioner Plugin for PostGraphile v5
 *
 * Adds S3 bucket provisioning support to PostGraphile v5:
 *
 * 1. `provisionBucket` mutation — explicitly provision an S3 bucket for a
 *    logical bucket row in the database. Reads the bucket config via RLS,
 *    then calls BucketProvisioner to create and configure the S3 bucket.
 *
 * This plugin uses `@constructive-io/bucket-provisioner` for the actual
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
import { recordPhysicalName as recordPhysicalBucketName } from 'graphile-storage-registry';
import { extendSchema, gql } from 'graphile-utils';

import type {
  BucketProvisionerPluginOptions,
} from './types';

const log = new Logger('graphile-bucket-provisioner:plugin');

// --- Storage module queries ---

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
  databaseId: string,
  bucketKey: string,
  options: BucketProvisionerPluginOptions,
): string {
  if (!options.resolveBucketName) {
    throw new Error(
      'STORAGE_BUCKET_NAME_POLICY_MISSING: no resolveBucketName was configured, so there is ' +
      `no name to provision for bucket "${bucketKey}" of database ${databaseId}. ` +
      'Physical bucket naming is a deployment policy; the configured s3.bucket is a ' +
      'connection default and is never a tenant bucket.',
    );
  }
  return options.resolveBucketName(databaseId, bucketKey);
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
  pluginOrigins: string[],
): string[] {
  if (bucketOrigins && bucketOrigins.length > 0) {
    return bucketOrigins;
  }
  if (storageModuleOrigins && storageModuleOrigins.length > 0) {
    return storageModuleOrigins;
  }
  return pluginOrigins;
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
 * Core provisioning logic for the explicit mutation.
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

// --- Plugin factory ---

/**
 * Creates the bucket provisioner plugin.
 *
 * This plugin provides one provisioning pathway:
 *
 * 1. **Explicit `provisionBucket` mutation** — Call this mutation with a
 *    bucket key to provision (or re-provision) the S3 bucket. Protected
 *    by RLS on the buckets table.
 *
 * @param options - Plugin configuration (S3 credentials, CORS origins, naming)
 */
export function createBucketProvisionerPlugin(
  options: BucketProvisionerPluginOptions,
): GraphileConfig.Plugin {
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
                ? resolveBucketName(databaseId, bucket.key, options)
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
                await withPgClient(null, (client: any) =>
                  recordPhysicalBucketName(
                    (query) => runQuery(client, query.text, query.values),
                    bucketsTable,
                    bucket.id,
                    result.bucketName,
                  ),
                );
                log.info(`Recorded physical_name="${result.bucketName}" on bucket ${bucket.id}`);

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

  return mutationPlugin;
}

export const BucketProvisionerPlugin = createBucketProvisionerPlugin;
export default BucketProvisionerPlugin;
