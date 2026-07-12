import { getMissingInstallableModules, parseAuthor,PgpmPackage } from '@pgpmjs/core';
import { mkdirSync, rmSync } from 'fs';
import { sync as glob } from 'glob';
import { toSnakeCase } from 'inflekt';
import { Inquirerer } from 'inquirerer';
import path from 'path';
import type { Pool } from 'pg';

import metaExportTables from './meta-export-tables.json';
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

export interface TableColumnInfo {
  udt_name: string;
  column_default: string | null;
}

/**
 * Query actual columns from information_schema for a given table.
 * Returns a map of column_name -> { udt_name, column_default }.
 */
export const getTableColumnsWithDefaults = async (
  pool: Pool,
  schemaName: string,
  tableName: string
): Promise<Map<string, TableColumnInfo>> => {
  const result = await pool.query(
    `
      SELECT column_name, udt_name, column_default
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `,
    [schemaName, tableName]
  );

  const columns = new Map<string, TableColumnInfo>();
  for (const row of result.rows) {
    columns.set(row.column_name, {
      udt_name: row.udt_name,
      column_default: row.column_default
    });
  }
  return columns;
};

/**
 * Detect whether a column default expression is a non-deterministic timestamp
 * default (now(), CURRENT_TIMESTAMP, clock_timestamp(), or now() + interval).
 * Exported INSERT rows must omit these columns so the DDL DEFAULT applies at
 * deploy time, keeping generated migrations deterministic.
 */
export const isTimestampDefaultColumn = (columnDefault: string | null): boolean => {
  if (!columnDefault) return false;
  const normalized = columnDefault.trim().toLowerCase();
  return /^(now\s*\(\s*\)|current_timestamp(?:\s*\(\s*\d*\s*\))?|clock_timestamp\s*\(\s*\))(?:\s*\+\s*'[^']*'\s*::\s*interval)?$/i.test(
    normalized
  );
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
 * A single entry in the generated meta export table manifest
 * (meta-export-tables.json, generated by constructive-db and propagated
 * here via constructive-hub's schema-propagation workflow).
 */
export interface MetaExportTableEntry {
  key: string;
  schema: string;
  table: string;
}

/**
 * Hand-authored per-table overrides layered on top of the generated
 * table manifest. Only exceptional exporter behavior lives here:
 * conflict handling, special field types (image, upload, url) that
 * cannot be inferred, GraphQL type name overrides, and columns whose
 * values must come from DDL defaults at deploy time.
 */
export const META_TABLE_OVERRIDES: Record<string, Omit<TableConfig, 'schema' | 'table'>> = {
  field: {
    conflictDoNothing: true
  },
  sites: {
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
    columnDefaults: {
      dbname: 'current_database()'
    }
  },
  apps: {
    typeOverrides: {
      app_image: 'image',
      app_store_link: 'url',
      play_store_link: 'url'
    }
  },
  site_metadata: {
    typeOverrides: {
      og_image: 'image'
    }
  },
  i18n_module: {
    gqlTypeName: 'I18NModule' // i18n is a well-known abbreviation; PostGraphile inflector capitalizes the N
  }
};

/**
 * Ordered list of meta tables for export, derived from the generated
 * manifest. Tables are already topologically sorted by foreign key
 * dependencies at generation time.
 */
export const META_TABLE_ORDER: string[] = (metaExportTables as { tables: MetaExportTableEntry[] }).tables.map(t => t.key);

/**
 * Shared metadata table configuration, built from the generated manifest
 * plus META_TABLE_OVERRIDES.
 *
 * Fields are discovered dynamically at runtime via introspection:
 * - SQL flow: uses information_schema.columns + mapPgTypeToFieldType()
 * - GraphQL flow: uses __type introspection + mapGraphQLTypeToFieldType()
 *
 * Only `typeOverrides` are hardcoded for special types (image, upload, url)
 * that cannot be inferred from database/GraphQL types alone.
 */
export const META_TABLE_CONFIG: Record<string, TableConfig> = Object.fromEntries(
  (metaExportTables as { tables: MetaExportTableEntry[] }).tables.map(t => [
    t.key,
    { schema: t.schema, table: t.table, ...META_TABLE_OVERRIDES[t.key] }
  ])
);

/**
 * Per-table timestamptz columns whose DDL default is non-deterministic
 * (now(), CURRENT_TIMESTAMP, clock_timestamp(), now() + interval).
 * Generated by constructive-db and propagated here via constructive-hub.
 * The GraphQL export path uses this to omit those columns without a DB pool.
 */
export const META_TABLE_TIMESTAMP_DEFAULTS: Record<string, string[]> =
  (metaExportTables as { timestampDefaultColumns?: Record<string, string[]> }).timestampDefaultColumns || {};

export const getTimestampDefaultColumnsForTable = (schema: string, table: string): string[] =>
  META_TABLE_TIMESTAMP_DEFAULTS[`${schema}.${table}`] || [];

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
  const sortedSchemas = [...schemas].sort((a, b) =>
    b.schema_name.length - a.schema_name.length || a.schema_name.localeCompare(b.schema_name)
  );
  const schemaReplacers: [string, string][] = sortedSchemas.map((schema) => [
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
    const plan = glob(path.join(pgpmDir, 'pgpm.plan')).sort((a, b) => a.localeCompare(b));
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
