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

import { context as grafastContext, lambda, object } from 'grafast';
import type { GraphileConfig } from 'graphile-config';
import { extendSchema, gql } from 'graphile-utils';
import { Logger } from '@pgpmjs/logger';
import {
  BucketProvisioner,
} from '@constructive-io/bucket-provisioner';
import type { StorageConnectionConfig, ProvisionResult } from '@constructive-io/bucket-provisioner';

import type {
  BucketProvisionerPluginOptions,
  BucketNameResolver,
} from './types';

const log = new Logger('graphile-bucket-provisioner:plugin');

// --- Storage module query (same as presigned-url-plugin) ---

const STORAGE_MODULE_QUERY = `
  SELECT
    sm.id,
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
  LIMIT 1
`;

interface StorageModuleRow {
  id: string;
  buckets_schema: string;
  buckets_table: string;
  endpoint: string | null;
  public_url_prefix: string | null;
  provider: string | null;
  allowed_origins: string[] | null;
}

interface BucketRow {
  id: string;
  key: string;
  type: string;
  is_public: boolean;
  allowed_origins: string[] | null;
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
  const result = await pgClient.query(
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
 * Core provisioning logic shared by both the explicit mutation and the
 * auto-provisioning hook.
 */
async function provisionBucketForRow(
  pgClient: any,
  databaseId: string,
  bucketKey: string,
  bucketType: string,
  bucketAllowedOrigins: string[] | null | undefined,
  options: BucketProvisionerPluginOptions,
): Promise<ProvisionResult> {
  const s3BucketName = resolveBucketName(bucketKey, databaseId, options);
  const accessType = bucketType as 'public' | 'private' | 'temp';

  // Read storage module config to check for endpoint/provider/CORS overrides
  const smResult = await pgClient.query(STORAGE_MODULE_QUERY, [databaseId]);
  const storageModule: StorageModuleRow | null = smResult.rows[0] ?? null;

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
  pgClient: any,
  databaseId: string,
  bucketKey: string,
  bucketType: string,
  bucketAllowedOrigins: string[] | null | undefined,
  options: BucketProvisionerPluginOptions,
): Promise<void> {
  const s3BucketName = resolveBucketName(bucketKey, databaseId, options);
  const accessType = bucketType as 'public' | 'private' | 'temp';

  const smResult = await pgClient.query(STORAGE_MODULE_QUERY, [databaseId]);
  const storageModule: StorageModuleRow | null = smResult.rows[0] ?? null;

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
            const { bucketKey } = input;

            if (!bucketKey || typeof bucketKey !== 'string') {
              throw new Error('INVALID_BUCKET_KEY');
            }

            return withPgClient(pgSettings, async (pgClient: any) => {
              // Resolve database ID from JWT context
              const databaseId = await resolveDatabaseId(pgClient);
              if (!databaseId) {
                throw new Error('DATABASE_NOT_FOUND');
              }

              // Read storage module config
              const smResult = await pgClient.query(STORAGE_MODULE_QUERY, [databaseId]);
              if (smResult.rows.length === 0) {
                throw new Error('STORAGE_MODULE_NOT_PROVISIONED');
              }
              const storageModule = smResult.rows[0] as StorageModuleRow;

              // Look up the bucket row (RLS enforced via pgSettings)
              const bucketResult = await pgClient.query(
                `SELECT id, key, type, is_public, allowed_origins
                 FROM "${storageModule.buckets_schema}"."${storageModule.buckets_table}"
                 WHERE key = $1
                 LIMIT 1`,
                [bucketKey],
              );

              if (bucketResult.rows.length === 0) {
                throw new Error('BUCKET_NOT_FOUND');
              }

              const bucket = bucketResult.rows[0] as BucketRow;

              try {
                const result = await provisionBucketForRow(
                  pgClient,
                  databaseId,
                  bucket.key,
                  bucket.type,
                  bucket.allowed_origins,
                  options,
                );

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
                  bucketName: resolveBucketName(bucket.key, databaseId, options),
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

                  await withPgClient(pgSettings, async (pgClient: any) => {
                    const databaseId = await resolveDatabaseId(pgClient);
                    if (!databaseId) {
                      log.warn('Auto-provision skipped: could not resolve database_id');
                      return;
                    }

                    await provisionBucketForRow(
                      pgClient,
                      databaseId,
                      bucketInput.key,
                      bucketInput.type,
                      bucketInput.allowedOrigins ?? bucketInput.allowed_origins ?? null,
                      options,
                    );
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

                    // Read the updated bucket row to get full state
                    const smResult = await pgClient.query(STORAGE_MODULE_QUERY, [databaseId]);
                    if (smResult.rows.length === 0) {
                      log.warn('CORS update skipped: storage module not provisioned');
                      return;
                    }
                    const storageModule = smResult.rows[0] as StorageModuleRow;

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
                    const bucketResult = await pgClient.query(
                      `SELECT id, key, type, is_public, allowed_origins
                       FROM "${storageModule.buckets_schema}"."${storageModule.buckets_table}"
                       WHERE key = $1
                       LIMIT 1`,
                      [patchKey],
                    );

                    if (bucketResult.rows.length === 0) {
                      log.warn(`CORS update skipped: bucket "${patchKey}" not found`);
                      return;
                    }

                    const bucket = bucketResult.rows[0] as BucketRow;

                    await updateBucketCors(
                      pgClient,
                      databaseId,
                      bucket.key,
                      bucket.type,
                      bucket.allowed_origins,
                      options,
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
