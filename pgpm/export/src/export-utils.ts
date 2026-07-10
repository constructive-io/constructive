import { mkdirSync, rmSync } from 'fs';
import { sync as glob } from 'glob';
import { Inquirerer } from 'inquirerer';
import { toSnakeCase } from 'inflekt';
import path from 'path';

import { PgpmPackage, getMissingInstallableModules, parseAuthor } from '@pgpmjs/core';
import { lookupByPgUdt } from './type-map';

// =============================================================================
// Shared constants
// =============================================================================

/**
 * Required extensions for database schema exports.
 * Includes native PostgreSQL extensions and pgpm modules.
 */
export const DB_REQUIRED_EXTENSIONS = [
  'plpgsql',
  'uuid-ossp',
  'citext',
  'pgcrypto',
  'btree_gin',
  'btree_gist',
  'pg_textsearch',
  'pg_trgm',
  'postgis',
  'hstore',
  'vector',
  'ltree',
  'metaschema-schema',
  'pgpm-inflection',
  'pgpm-uuid',
  'pgpm-utils',
  'pgpm-database-jobs',
  'pgpm-jwt-claims',
  'pgpm-stamps',
  'pgpm-base32',
  'pgpm-totp',
  'pgpm-types',
  'pgpm-ltree-helpers',
  'pgpm-partman'
] as const;

/**
 * Map PostgreSQL data types to FieldType values.
 * Uses udt_name from information_schema which gives the base type name.
 * Delegates to the canonical PG_TYPE_MAP in type-map.ts.
 */
export const mapPgTypeToFieldType = (udtName: string): FieldType => {
  const entry = lookupByPgUdt(udtName);
  return entry?.fieldType ?? 'text';
};

/**
 * Required extensions for service/meta exports.
 * Includes native PostgreSQL extensions and pgpm modules for metadata management.
 */
export const SERVICE_REQUIRED_EXTENSIONS = [
  'plpgsql',
  'metaschema-schema',
  'metaschema-modules',
  'services'
] as const;

/**
 * Common SQL header for meta export files.
 * Sets session_replication_role and grants necessary permissions.
 */
export const META_COMMON_HEADER = `SET session_replication_role TO replica;
-- using replica in case we are deploying triggers to metaschema_public

-- unaccent, postgis affected and require grants
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public to public;

DO $LQLMIGRATION$
  DECLARE
  BEGIN

    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_user');
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_admin');

  END;
$LQLMIGRATION$;`;

/**
 * Common SQL footer for meta export files.
 */
export const META_COMMON_FOOTER = `
SET session_replication_role TO DEFAULT;`;

/**
 * Ordered list of meta tables for export.
 * Tables are processed in this order to satisfy foreign key dependencies.
 */
export const META_TABLE_ORDER = [
  'database',
  'schema',
  'function',
  'table',
  'field',
  'spatial_relation',
  'policy',
  'index',
  'trigger',
  'trigger_function',
  'rls_function',
  'foreign_key_constraint',
  'primary_key_constraint',
  'unique_constraint',
  'check_constraint',
  'full_text_search',
  'schema_grant',
  'table_grant',
  'default_privilege',
  'domains',
  'sites',
  'apis',
  'apps',
  'site_modules',
  'site_themes',
  'site_metadata',
  'api_modules',
  'api_extensions',
  'api_schemas',
  'database_settings',
  'api_settings',
  'rls_settings',
  'cors_settings',
  'pubkey_settings',
  'webauthn_settings',
  'rls_module',
  'user_auth_module',
  'memberships_module',
  'permissions_module',
  'limits_module',
  'levels_module',
  'events_module',
  'users_module',
  'hierarchy_module',
  'membership_types_module',
  'invites_module',
  'emails_module',
  'sessions_module',
  'user_state_module',
  'profiles_module',
  'config_secrets_user_module',
  'user_credentials_module',
  'user_settings_module',
  'connected_accounts_module',
  'phone_numbers_module',
  'crypto_addresses_module',
  'crypto_auth_module',
  'field_module',
  'table_module',
  'secure_table_provision',
  'uuid_module',
  'default_ids_module',
  'denormalized_table_field',
  // NOTE: blueprint_template, blueprint, and blueprint_construction are intentionally
  // excluded from the export flow — they are runtime-only tables not exported as metadata.
  'relation_provision',
  'entity_type_provision',
  'rate_limits_module',
  'storage_module',
  'billing_module',
  'billing_provider_module',
  'devices_module',
  'identity_providers_module',
  'notifications_module',
  'plans_module',
  'realtime_module',
  'session_secrets_module',
  'config_secrets_org_module',
  'infra_secrets_module',
  'infra_config_module',
  'internal_secrets_module',
  'i18n_module',
  'agent_module',
  'function_module',
  'namespace_module',
  'merkle_store_module',
  'graph_module',
  'graph_execution_module',
  'function_deployment_module',
  'function_invocation_module',
  'compute_log_module',
  'db_usage_module',
  'storage_log_module',
  'transfer_log_module',
  'webauthn_auth_module',
  'webauthn_credentials_module',
  'inference_log_module',
  'rate_limit_meters_module'
] as const;

// =============================================================================
// Shared types for table config
// =============================================================================

export type FieldType = 'uuid' | 'uuid[]' | 'text' | 'text[]' | 'boolean' | 'image' | 'upload' | 'url' | 'jsonb' | 'jsonb[]' | 'int' | 'interval' | 'timestamptz';

export interface TableConfig {
  schema: string;
  table: string;
  conflictDoNothing?: boolean;
  typeOverrides?: Record<string, FieldType>; // only for special types (image, upload, url) that can't be inferred
  gqlTypeName?: string; // override for GraphQL type name when automatic derivation doesn't match PostGraphile's inflector
  /** Columns whose values are environment-specific and should be excluded from the
   *  exported INSERT so that the column's DDL DEFAULT applies at deploy time.
   *  Key = column name, Value = the SQL expression the column defaults to (for documentation).
   *  E.g. { dbname: 'current_database()' } — the exporter omits `dbname` from the
   *  INSERT, and `DEFAULT current_database()` in the table definition supplies it. */
  columnDefaults?: Record<string, string>;
}

/**
 * Shared metadata table configuration.
 * 
 * Fields are discovered dynamically at runtime via introspection:
 * - SQL flow: uses information_schema.columns + mapPgTypeToFieldType()
 * - GraphQL flow: uses __type introspection + mapGraphQLTypeToFieldType()
 * 
 * Only `typeOverrides` are hardcoded for special types (image, upload, url)
 * that cannot be inferred from database/GraphQL types alone.
 * 
 */
export const META_TABLE_CONFIG: Record<string, TableConfig> = {
  // =============================================================================
  // metaschema_public tables
  // =============================================================================
  database: {
    schema: 'metaschema_public',
    table: 'database'
  },
  schema: {
    schema: 'metaschema_public',
    table: 'schema'
  },
  function: {
    schema: 'metaschema_public',
    table: 'function'
  },
  table: {
    schema: 'metaschema_public',
    table: 'table'
  },
  field: {
    schema: 'metaschema_public',
    table: 'field',
    conflictDoNothing: true
  },
  policy: {
    schema: 'metaschema_public',
    table: 'policy'
  },
  index: {
    schema: 'metaschema_public',
    table: 'index'
  },
  trigger: {
    schema: 'metaschema_public',
    table: 'trigger'
  },
  trigger_function: {
    schema: 'metaschema_public',
    table: 'trigger_function'
  },
  rls_function: {
    schema: 'metaschema_public',
    table: 'rls_function'
  },
  foreign_key_constraint: {
    schema: 'metaschema_public',
    table: 'foreign_key_constraint'
  },
  primary_key_constraint: {
    schema: 'metaschema_public',
    table: 'primary_key_constraint'
  },
  unique_constraint: {
    schema: 'metaschema_public',
    table: 'unique_constraint'
  },
  check_constraint: {
    schema: 'metaschema_public',
    table: 'check_constraint'
  },
  full_text_search: {
    schema: 'metaschema_public',
    table: 'full_text_search'
  },
  schema_grant: {
    schema: 'metaschema_public',
    table: 'schema_grant'
  },
  table_grant: {
    schema: 'metaschema_public',
    table: 'table_grant'
  },
  default_privilege: {
    schema: 'metaschema_public',
    table: 'default_privilege'
  },
  // =============================================================================
  // services_public tables
  // =============================================================================
  domains: {
    schema: 'services_public',
    table: 'domains'
  },
  sites: {
    schema: 'services_public',
    table: 'sites',
    typeOverrides: {
      og_image: 'image',
      favicon: 'upload',
      apple_touch_icon: 'image',
      logo: 'image'
    },
    columnDefaults: {
      dbname: 'current_database()'
    }
  },
  apis: {
    schema: 'services_public',
    table: 'apis',
    columnDefaults: {
      dbname: 'current_database()'
    }
  },
  apps: {
    schema: 'services_public',
    table: 'apps',
    typeOverrides: {
      app_image: 'image',
      app_store_link: 'url',
      play_store_link: 'url'
    }
  },
  site_modules: {
    schema: 'services_public',
    table: 'site_modules'
  },
  site_themes: {
    schema: 'services_public',
    table: 'site_themes'
  },
  site_metadata: {
    schema: 'services_public',
    table: 'site_metadata',
    typeOverrides: {
      og_image: 'image'
    }
  },
  api_modules: {
    schema: 'services_public',
    table: 'api_modules'
  },
  api_extensions: {
    schema: 'services_public',
    table: 'api_extensions'
  },
  api_schemas: {
    schema: 'services_public',
    table: 'api_schemas'
  },
  database_settings: {
    schema: 'services_public',
    table: 'database_settings'
  },
  api_settings: {
    schema: 'services_public',
    table: 'api_settings'
  },
  rls_settings: {
    schema: 'services_public',
    table: 'rls_settings'
  },
  cors_settings: {
    schema: 'services_public',
    table: 'cors_settings'
  },
  pubkey_settings: {
    schema: 'services_public',
    table: 'pubkey_settings'
  },
  webauthn_settings: {
    schema: 'services_public',
    table: 'webauthn_settings'
  },
  // =============================================================================
  // metaschema_modules_public tables
  // =============================================================================
  rls_module: {
    schema: 'metaschema_modules_public',
    table: 'rls_module'
  },
  user_auth_module: {
    schema: 'metaschema_modules_public',
    table: 'user_auth_module'
  },
  memberships_module: {
    schema: 'metaschema_modules_public',
    table: 'memberships_module'
  },
  permissions_module: {
    schema: 'metaschema_modules_public',
    table: 'permissions_module'
  },
  limits_module: {
    schema: 'metaschema_modules_public',
    table: 'limits_module'
  },
  levels_module: {
    schema: 'metaschema_modules_public',
    table: 'levels_module'
  },
  events_module: {
    schema: 'metaschema_modules_public',
    table: 'events_module'
  },
  users_module: {
    schema: 'metaschema_modules_public',
    table: 'users_module'
  },
  hierarchy_module: {
    schema: 'metaschema_modules_public',
    table: 'hierarchy_module'
  },
  membership_types_module: {
    schema: 'metaschema_modules_public',
    table: 'membership_types_module'
  },
  invites_module: {
    schema: 'metaschema_modules_public',
    table: 'invites_module'
  },
  emails_module: {
    schema: 'metaschema_modules_public',
    table: 'emails_module'
  },
  sessions_module: {
    schema: 'metaschema_modules_public',
    table: 'sessions_module'
  },
  user_state_module: {
    schema: 'metaschema_modules_public',
    table: 'user_state_module'
  },
  profiles_module: {
    schema: 'metaschema_modules_public',
    table: 'profiles_module'
  },
  config_secrets_user_module: {
    schema: 'metaschema_modules_public',
    table: 'config_secrets_user_module'
  },
  user_credentials_module: {
    schema: 'metaschema_modules_public',
    table: 'user_credentials_module'
  },
  user_settings_module: {
    schema: 'metaschema_modules_public',
    table: 'user_settings_module'
  },
  connected_accounts_module: {
    schema: 'metaschema_modules_public',
    table: 'connected_accounts_module'
  },
  phone_numbers_module: {
    schema: 'metaschema_modules_public',
    table: 'phone_numbers_module'
  },
  crypto_addresses_module: {
    schema: 'metaschema_modules_public',
    table: 'crypto_addresses_module'
  },
  crypto_auth_module: {
    schema: 'metaschema_modules_public',
    table: 'crypto_auth_module'
  },
  field_module: {
    schema: 'metaschema_modules_public',
    table: 'field_module'
  },
  table_module: {
    schema: 'metaschema_modules_public',
    table: 'table_module'
  },
  // NOTE: table_template_module has been removed from pgpm-modules (superseded by blueprints)
  secure_table_provision: {
    schema: 'metaschema_modules_public',
    table: 'secure_table_provision'
  },
  uuid_module: {
    schema: 'metaschema_modules_public',
    table: 'uuid_module'
  },
  default_ids_module: {
    schema: 'metaschema_modules_public',
    table: 'default_ids_module'
  },
  denormalized_table_field: {
    schema: 'metaschema_modules_public',
    table: 'denormalized_table_field'
  },
  relation_provision: {
    schema: 'metaschema_modules_public',
    table: 'relation_provision'
  },
  entity_type_provision: {
    schema: 'metaschema_modules_public',
    table: 'entity_type_provision'
  },
  rate_limits_module: {
    schema: 'metaschema_modules_public',
    table: 'rate_limits_module'
  },
  storage_module: {
    schema: 'metaschema_modules_public',
    table: 'storage_module'
  },
  billing_module: {
    schema: 'metaschema_modules_public',
    table: 'billing_module'
  },
  billing_provider_module: {
    schema: 'metaschema_modules_public',
    table: 'billing_provider_module'
  },
  devices_module: {
    schema: 'metaschema_modules_public',
    table: 'devices_module'
  },
  identity_providers_module: {
    schema: 'metaschema_modules_public',
    table: 'identity_providers_module'
  },
  notifications_module: {
    schema: 'metaschema_modules_public',
    table: 'notifications_module'
  },
  plans_module: {
    schema: 'metaschema_modules_public',
    table: 'plans_module'
  },
  realtime_module: {
    schema: 'metaschema_modules_public',
    table: 'realtime_module'
  },
  session_secrets_module: {
    schema: 'metaschema_modules_public',
    table: 'session_secrets_module'
  },
  config_secrets_org_module: {
    schema: 'metaschema_modules_public',
    table: 'config_secrets_org_module'
  },
  infra_secrets_module: {
    schema: 'metaschema_modules_public',
    table: 'infra_secrets_module'
  },
  infra_config_module: {
    schema: 'metaschema_modules_public',
    table: 'infra_config_module'
  },
  internal_secrets_module: {
    schema: 'metaschema_modules_public',
    table: 'internal_secrets_module'
  },
  i18n_module: {
    schema: 'metaschema_modules_public',
    table: 'i18n_module',
    gqlTypeName: 'I18NModule' // i18n is a well-known abbreviation; PostGraphile inflector capitalizes the N
  },
  agent_module: {
    schema: 'metaschema_modules_public',
    table: 'agent_module'
  },
  function_module: {
    schema: 'metaschema_modules_public',
    table: 'function_module'
  },
  namespace_module: {
    schema: 'metaschema_modules_public',
    table: 'namespace_module'
  },
  merkle_store_module: {
    schema: 'metaschema_modules_public',
    table: 'merkle_store_module'
  },
  graph_module: {
    schema: 'metaschema_modules_public',
    table: 'graph_module'
  },
  graph_execution_module: {
    schema: 'metaschema_modules_public',
    table: 'graph_execution_module'
  },
  function_deployment_module: {
    schema: 'metaschema_modules_public',
    table: 'function_deployment_module'
  },
  function_invocation_module: {
    schema: 'metaschema_modules_public',
    table: 'function_invocation_module'
  },
  compute_log_module: {
    schema: 'metaschema_modules_public',
    table: 'compute_log_module'
  },
  db_usage_module: {
    schema: 'metaschema_modules_public',
    table: 'db_usage_module'
  },
  storage_log_module: {
    schema: 'metaschema_modules_public',
    table: 'storage_log_module'
  },
  transfer_log_module: {
    schema: 'metaschema_modules_public',
    table: 'transfer_log_module'
  },
  webauthn_auth_module: {
    schema: 'metaschema_modules_public',
    table: 'webauthn_auth_module'
  },
  webauthn_credentials_module: {
    schema: 'metaschema_modules_public',
    table: 'webauthn_credentials_module'
  },
  inference_log_module: {
    schema: 'metaschema_modules_public',
    table: 'inference_log_module',
  },
  rate_limit_meters_module: {
    schema: 'metaschema_modules_public',
    table: 'rate_limit_meters_module',
  },
  spatial_relation: {
    schema: 'metaschema_public',
    table: 'spatial_relation'
  }
};

// =============================================================================
// Shared interfaces
// =============================================================================

export interface Schema {
  name: string;
  schema_name: string;
}

export interface MakeReplacerOptions {
  schemas: Schema[];
  name: string;
  /**
   * Optional prefix for schema name replacement.
   * When provided, schema names are replaced using this prefix instead of `name`.
   * This is needed for the services/meta package where `name` is the services
   * extension name (e.g. "agent-db-services") but schemas should use the
   * application extension prefix (e.g. "agent-db" → "agent_db_auth_public").
   */
  schemaPrefix?: string;
}

export interface ReplacerResult {
  replacer: (str: string, n?: number) => string;
  replace: [RegExp, string][];
}

export interface PreparePackageOptions {
  project: PgpmPackage;
  author: string;
  outdir: string;
  name: string;
  description: string;
  extensions: string[];
  prompter?: Inquirerer;
  /** Repository name for module scaffolding. Defaults to module name if not provided. */
  repoName?: string;
  /** GitHub username/org for module scaffolding. Required for non-interactive use. */
  username?: string;
}

/**
 * Result of checking for missing modules at workspace level.
 */
export interface MissingModulesResult {
  missingModules: { controlName: string; npmName: string }[];
  shouldInstall: boolean;
}

// =============================================================================
// Shared functions
// =============================================================================

/**
 * Checks which pgpm modules from the extensions list are missing from the workspace
 * and prompts the user if they want to install them.
 *
 * This function only does detection and prompting - it does NOT install.
 * Use installMissingModules() after the module is created to do the actual installation.
 *
 * @param project - The PgpmPackage instance (only needs workspace context)
 * @param extensions - List of extension names (control file names)
 * @param prompter - Optional prompter for interactive confirmation
 * @returns Object with missing modules and whether user wants to install them
 */
export const detectMissingModules = async (
  project: PgpmPackage,
  extensions: string[],
  prompter?: Inquirerer,
  argv?: Record<string, any>
): Promise<MissingModulesResult> => {
  // Use workspace-level check - doesn't require being inside a module
  const installed = project.getWorkspaceInstalledModules();
  const missingModules = getMissingInstallableModules(extensions, installed);

  if (missingModules.length === 0) {
    return { missingModules: [], shouldInstall: false };
  }

  const missingNames = missingModules.map(m => m.npmName);
  console.log(`\nMissing pgpm modules detected: ${missingNames.join(', ')}`);

  if (prompter) {
    const { install } = await prompter.prompt(argv || {}, [
      {
        type: 'confirm',
        name: 'install',
        message: `Install missing modules (${missingNames.join(', ')})?`,
        default: true
      }
    ]);

    return { missingModules, shouldInstall: install };
  }

  return { missingModules, shouldInstall: false };
};

/**
 * Installs missing modules into a specific module directory.
 * Must be called after the module has been created.
 *
 * @param moduleDir - The directory of the module to install into
 * @param missingModules - Array of missing modules to install
 */
export const installMissingModules = async (
  moduleDir: string,
  missingModules: { controlName: string; npmName: string }[]
): Promise<void> => {
  if (missingModules.length === 0) {
    return;
  }

  const missingNames = missingModules.map(m => m.npmName);
  console.log('Installing missing modules...');

  // Create a new PgpmPackage instance pointing to the module directory
  const moduleProject = new PgpmPackage(moduleDir);
  await moduleProject.installModules(...missingNames);

  console.log('Modules installed successfully.');
};

/**
 * Generates a function for replacing schema names and extension names in strings.
 */
export const makeReplacer = ({ schemas, name, schemaPrefix }: MakeReplacerOptions): ReplacerResult => {
  const replacements: [string, string] = ['constructive-extension-name', name];
  const prefix = schemaPrefix || name;
  const schemaReplacers: [string, string][] = schemas.map((schema) => [
    schema.schema_name,
    toSnakeCase(`${prefix}_${schema.name}`)
  ]);

  const replace: [RegExp, string][] = [...schemaReplacers, replacements].map(
    ([from, to]) => [new RegExp(from, 'g'), to]
  );

  const replacer = (str: string, n = 0): string => {
    if (!str) return '';
    if (replace[n] && replace[n].length === 2) {
      return replacer(str.replace(replace[n][0], replace[n][1]), n + 1);
    }
    return str;
  };

  return { replacer, replace };
};

/**
 * Creates a PGPM package directory or resets the deploy/revert/verify directories if it exists.
 * If the module already exists and a prompter is provided, prompts the user for confirmation.
 *
 * @returns The absolute path to the created/prepared module directory
 */
export const preparePackage = async ({
  project,
  author,
  outdir,
  name,
  description,
  extensions,
  prompter,
  repoName,
  username
}: PreparePackageOptions): Promise<string> => {
  const curDir = process.cwd();
  const pgpmDir = path.resolve(path.join(outdir, name));
  mkdirSync(pgpmDir, { recursive: true });
  process.chdir(pgpmDir);

  try {
    const plan = glob(path.join(pgpmDir, 'pgpm.plan'));
    if (!plan.length) {
      const { fullName, email } = parseAuthor(author);

      // Always run non-interactively — all answers are pre-filled
      const effectiveUsername = username || fullName || 'export';

      await project.initModule({
        name,
        description,
        author,
        extensions,
        // Use outputDir to create module directly in the specified location
        outputDir: outdir,
        noTty: true,
        prompter,
        answers: {
          moduleName: name,
          moduleDesc: description,
          access: 'restricted',
          license: 'CONSTRUCTIVE',
          fullName,
          ...(email && { email }),
          // Use provided values or sensible defaults
          repoName: repoName || name,
          username: effectiveUsername
        }
      });
    } else {
      if (prompter) {
        const { overwrite } = await prompter.prompt({} as Record<string, any>, [
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Module "${name}" already exists at ${pgpmDir}. Overwrite deploy/revert/verify directories?`,
            default: true,
            useDefault: true
          }
        ]);
        if (!overwrite) {
          throw new Error(`Export cancelled: Module "${name}" already exists.`);
        }
      }
      rmSync(path.resolve(pgpmDir, 'deploy'), { recursive: true, force: true });
      rmSync(path.resolve(pgpmDir, 'revert'), { recursive: true, force: true });
      rmSync(path.resolve(pgpmDir, 'verify'), { recursive: true, force: true });
    }
  } finally {
    process.chdir(curDir);
  }

  return pgpmDir;
};

/**
 * Normalizes an output directory path to ensure it ends with a path separator.
 */
export const normalizeOutdir = (outdir: string): string => {
  return outdir.endsWith(path.sep) ? outdir : outdir + path.sep;
};
