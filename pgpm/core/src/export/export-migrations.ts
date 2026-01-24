import { PgpmOptions } from '@pgpmjs/types';
import { mkdirSync, rmSync } from 'fs';
import { sync as glob } from 'glob';
import { toSnakeCase } from 'komoji';
import path from 'path';
import { getPgPool } from 'pg-cache';

import { PgpmPackage } from '../core/class/pgpm';
import { PgpmRow, SqlWriteOptions, writePgpmFiles, writePgpmPlan } from '../files';
import { getMissingInstallableModules } from '../modules/modules';
import { parseAuthor } from '../utils/author';
import { exportMeta } from './export-meta';

/**
 * Required extensions for database schema exports.
 * Includes native PostgreSQL extensions and pgpm modules.
 */
const DB_REQUIRED_EXTENSIONS = [
  'plpgsql',
  'uuid-ossp',
  'citext',
  'pgcrypto',
  'btree_gist',
  'postgis',
  'hstore',
  'metaschema-schema',
  'pgpm-inflection',
  'pgpm-uuid',
  'pgpm-utils',
  'pgpm-database-jobs',
  'pgpm-jwt-claims',
  'pgpm-stamps',
  'pgpm-base32',
  'pgpm-totp',
  'pgpm-types'
] as const;

/**
 * Required extensions for service/meta exports.
 * Includes native PostgreSQL extensions and pgpm modules for metadata management.
 */
const SERVICE_REQUIRED_EXTENSIONS = [
  'plpgsql',
  'metaschema-schema',
  'metaschema-modules',
  'services'
] as const;

/**
 * Prompter interface for interactive prompts.
 * Compatible with Inquirerer from the CLI.
 */
interface Prompter {
  prompt: (argv: any, questions: any[]) => Promise<Record<string, any>>;
}

/**
 * Result of checking for missing modules at workspace level.
 */
interface MissingModulesResult {
  missingModules: { controlName: string; npmName: string }[];
  shouldInstall: boolean;
}

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
const detectMissingModules = async (
  project: PgpmPackage,
  extensions: string[],
  prompter?: Prompter
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
    const { install } = await prompter.prompt({}, [
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
const installMissingModules = async (
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

interface ExportMigrationsToDiskOptions {
  project: PgpmPackage;
  options: PgpmOptions;
  database: string;
  databaseId: string;
  databaseName: string;
  author: string;
  outdir: string;
  schema_names: string[];
  extensionName?: string;
  extensionDesc?: string;
  metaExtensionName: string;
  metaExtensionDesc?: string;
  prompter?: Prompter;
  /** Repository name for module scaffolding. Defaults to module name if not provided. */
  repoName?: string;
  /** GitHub username/org for module scaffolding. Required for non-interactive use. */
  username?: string;
  /** Output directory for service/meta module. Defaults to outdir if not provided. */
  serviceOutdir?: string;
  /**
   * Skip schema name replacement for infrastructure schemas.
   * When true, schema names like metaschema_public, services_public will not be renamed.
   * Useful for self-referential introspection where you want to apply policies to real schemas.
   */
  skipSchemaRenaming?: boolean;
}

interface ExportOptions {
  project: PgpmPackage;
  options: PgpmOptions;
  dbInfo: {
    dbname: string;
    databaseName: string;
    database_ids: string[];
  };
  author: string;
  outdir: string;
  schema_names: string[];
  extensionName?: string;
  extensionDesc?: string;
  metaExtensionName: string;
  metaExtensionDesc?: string;
  prompter?: Prompter;
  /** Repository name for module scaffolding. Defaults to module name if not provided. */
  repoName?: string;
  /** GitHub username/org for module scaffolding. Required for non-interactive use. */
  username?: string;
  /** Output directory for service/meta module. Defaults to outdir if not provided. */
  serviceOutdir?: string;
  /**
   * Skip schema name replacement for infrastructure schemas.
   * When true, schema names like metaschema_public, services_public will not be renamed.
   * Useful for self-referential introspection where you want to apply policies to real schemas.
   */
  skipSchemaRenaming?: boolean;
}

const exportMigrationsToDisk = async ({
  project,
  options,
  database,
  databaseId,
  databaseName,
  author,
  outdir,
  schema_names,
  extensionName,
  extensionDesc,
  metaExtensionName,
  metaExtensionDesc,
  prompter,
  repoName,
  username,
  serviceOutdir,
  skipSchemaRenaming = false
}: ExportMigrationsToDiskOptions): Promise<void> => {
  outdir = outdir + '/';
  // Use serviceOutdir for service module, defaulting to outdir if not provided
  const svcOutdir = (serviceOutdir || outdir.slice(0, -1)) + '/';

  const pgPool = getPgPool({
    ...options.pg,
    database
  });

  const db = await pgPool.query(
    `select * from metaschema_public.database where id=$1`,
    [databaseId]
  );

  const schemas = await pgPool.query(
    `select * from metaschema_public.schema where database_id=$1`,
    [databaseId]
  );

  if (!db?.rows?.length) {
    console.log('NO DATABASES.');
    return;
  }

  if (!schemas?.rows?.length) {
    console.log('NO SCHEMAS.');
    return;
  }

  const name = extensionName || db.rows[0].name;

  // When skipSchemaRenaming is true, pass empty schemas array to avoid renaming
  // This is useful for self-referential introspection where you want to apply
  // policies to real infrastructure schemas (metaschema_public, services_public, etc.)
  const schemasForReplacement = skipSchemaRenaming
    ? []
    : schemas.rows.filter((schema: any) => schema_names.includes(schema.schema_name));

  const { replace, replacer } = makeReplacer({
    schemas: schemasForReplacement,
    name
  });

  // Filter sql_actions by database_id to avoid cross-database pollution
  // Previously this query had no WHERE clause, which could export actions
  // from unrelated databases in a persistent database environment
  const results = await pgPool.query(
    `select * from db_migrate.sql_actions where database_id = $1 order by id`,
    [databaseId]
  );

  const opts: SqlWriteOptions = {
    name,
    replacer,
    outdir,
    author
  };

  // Build description for the database extension package
  const dbExtensionDesc = extensionDesc || `${name} database schema for ${databaseName}`;

  if (results?.rows?.length > 0) {
    // Detect missing modules at workspace level and prompt user
    const dbMissingResult = await detectMissingModules(project, [...DB_REQUIRED_EXTENSIONS], prompter);

    // Create/prepare the module directory
    const dbModuleDir = await preparePackage({
      project,
      author,
      outdir,
      name,
      description: dbExtensionDesc,
      extensions: [...DB_REQUIRED_EXTENSIONS],
      prompter,
      repoName,
      username
    });

    // Install missing modules if user confirmed (now that module exists)
    if (dbMissingResult.shouldInstall) {
      await installMissingModules(dbModuleDir, dbMissingResult.missingModules);
    }

    writePgpmPlan(results.rows, opts);
    writePgpmFiles(results.rows, opts);

    const metaResult = await exportMeta({
      opts: options,
      dbname: database,
      database_id: databaseId
    });

    // Build description for the meta/service extension package
    const metaDesc = metaExtensionDesc || `${metaExtensionName} service utilities for managing domains, APIs, and services`;

    // Detect missing modules at workspace level and prompt user
    const svcMissingResult = await detectMissingModules(project, [...SERVICE_REQUIRED_EXTENSIONS], prompter);

    // Create/prepare the module directory (use serviceOutdir if provided)
    const svcModuleDir = await preparePackage({
      project,
      author,
      outdir: svcOutdir,
      name: metaExtensionName,
      description: metaDesc,
      extensions: [...SERVICE_REQUIRED_EXTENSIONS],
      prompter,
      repoName,
      username
    });

    // Install missing modules if user confirmed (now that module exists)
    if (svcMissingResult.shouldInstall) {
      await installMissingModules(svcModuleDir, svcMissingResult.missingModules);
    }

    // Use same skipSchemaRenaming logic for meta replacer
    const metaSchemasForReplacement = skipSchemaRenaming
      ? []
      : schemas.rows.filter((schema: any) => schema_names.includes(schema.schema_name));

    const metaReplacer = makeReplacer({
      schemas: metaSchemasForReplacement,
      name: metaExtensionName
    });

    // Create separate files for each table type
    const metaPackage: PgpmRow[] = [];

    // Common header for all meta files
    const commonHeader = `SET session_replication_role TO replica;
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

    const commonFooter = `
SET session_replication_role TO DEFAULT;`;

    // Define table ordering with dependencies
    // Tables that depend on 'database' being inserted first
    const tableOrder = [
      'database',
      'schema',
      'table',
      'field',
      'policy',
      'index',
      'trigger',
      'trigger_function',
      'rls_function',
      'limit_function',
      'procedure',
      'foreign_key_constraint',
      'primary_key_constraint',
      'unique_constraint',
      'check_constraint',
      'full_text_search',
      'schema_grant',
      'table_grant',
      'domains',
      'sites',
      'apis',
      'apps',
      'site_modules',
      'site_themes',
      'site_metadata',
      'api_modules',
      'api_schemas',
      'rls_module',
      'user_auth_module',
      'memberships_module',
      'permissions_module',
      'limits_module',
      'levels_module',
      'users_module',
      'hierarchy_module',
      'membership_types_module',
      'invites_module',
      'emails_module',
      'tokens_module',
      'secrets_module',
      'profiles_module',
      'encrypted_secrets_module',
      'connected_accounts_module',
      'phone_numbers_module',
      'crypto_addresses_module',
      'crypto_auth_module',
      'field_module',
      'table_module',
      'user_profiles_module',
      'user_settings_module',
      'organization_settings_module',
      'uuid_module',
      'default_ids_module',
      'denormalized_table_field'
    ];

    // Track which tables have content for dependency resolution
    const tablesWithContent: string[] = [];

    // Create a file for each table type that has content
    for (const tableName of tableOrder) {
      const tableSql = metaResult[tableName];
      if (tableSql) {
        const replacedSql = metaReplacer.replacer(tableSql);
        
        // Determine dependencies - each table depends on the previous tables that have content
        // This ensures proper ordering during deployment
        const deps = tableName === 'database' 
          ? [] 
          : tablesWithContent.length > 0 
            ? [`migrate/${tablesWithContent[tablesWithContent.length - 1]}`]
            : [];

        metaPackage.push({
          deps,
          deploy: `migrate/${tableName}`,
          content: `${commonHeader}

${replacedSql}

${commonFooter}
`
        });

        tablesWithContent.push(tableName);
      }
    }

    opts.replacer = metaReplacer.replacer;
    opts.name = metaExtensionName;
    opts.outdir = svcOutdir;

    writePgpmPlan(metaPackage, opts);
    writePgpmFiles(metaPackage, opts);
  }

  pgPool.end();
};

export const exportMigrations = async ({
  project,
  options,
  dbInfo,
  author,
  outdir,
  schema_names,
  extensionName,
  extensionDesc,
  metaExtensionName,
  metaExtensionDesc,
  prompter,
  repoName,
  username,
  serviceOutdir,
  skipSchemaRenaming
}: ExportOptions): Promise<void> => {
  for (let v = 0; v < dbInfo.database_ids.length; v++) {
    const databaseId = dbInfo.database_ids[v];
    await exportMigrationsToDisk({
      project,
      options,
      extensionName,
      extensionDesc,
      metaExtensionName,
      metaExtensionDesc,
      database: dbInfo.dbname,
      databaseName: dbInfo.databaseName,
      databaseId,
      schema_names,
      author,
      outdir,
      prompter,
      repoName,
      username,
      serviceOutdir,
      skipSchemaRenaming
    });
  }
};


interface PreparePackageOptions {
  project: PgpmPackage;
  author: string;
  outdir: string;
  name: string;
  description: string;
  extensions: string[];
  prompter?: Prompter;
  /** Repository name for module scaffolding. Defaults to module name if not provided. */
  repoName?: string;
  /** GitHub username/org for module scaffolding. Required for non-interactive use. */
  username?: string;
}

interface Schema {
  name: string;
  schema_name: string;
}

interface MakeReplacerOptions {
  schemas: Schema[];
  name: string;
}

interface ReplacerResult {
  replacer: (str: string, n?: number) => string;
  replace: [RegExp, string][];
}

/**
 * Creates a PGPM package directory or resets the deploy/revert/verify directories if it exists.
 * If the module already exists and a prompter is provided, prompts the user for confirmation.
 *
 * @returns The absolute path to the created/prepared module directory
 */
const preparePackage = async ({
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

  const plan = glob(path.join(pgpmDir, 'pgpm.plan'));
  if (!plan.length) {
    const { fullName, email } = parseAuthor(author);

    await project.initModule({
      name,
      description,
      author,
      extensions,
      // Use outputDir to create module directly in the specified location
      outputDir: outdir,
      answers: {
        moduleName: name,
        moduleDesc: description,
        access: 'restricted',
        license: 'CLOSED',
        fullName,
        ...(email && { email }),
        // Use provided values or sensible defaults
        repoName: repoName || name,
        ...(username && { username })
      }
    });
  } else {
    if (prompter) {
      const { overwrite } = await prompter.prompt({}, [
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Module "${name}" already exists at ${pgpmDir}. Overwrite deploy/revert/verify directories?`,
          default: false
        }
      ]);
      if (!overwrite) {
        process.chdir(curDir);
        throw new Error(`Export cancelled: Module "${name}" already exists.`);
      }
    }
    rmSync(path.resolve(pgpmDir, 'deploy'), { recursive: true, force: true });
    rmSync(path.resolve(pgpmDir, 'revert'), { recursive: true, force: true });
    rmSync(path.resolve(pgpmDir, 'verify'), { recursive: true, force: true });
  }

  process.chdir(curDir);
  return pgpmDir;
};

/**
 * Generates a function for replacing schema names and extension names in strings.
 */
const makeReplacer = ({ schemas, name }: MakeReplacerOptions): ReplacerResult => {
  const replacements: [string, string] = ['constructive-extension-name', name];
  const schemaReplacers: [string, string][] = schemas.map((schema) => [
    schema.schema_name,
    toSnakeCase(`${name}_${schema.name}`)
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
