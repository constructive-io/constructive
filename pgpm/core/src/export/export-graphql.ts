/**
 * GraphQL-based export orchestrator.
 * 
 * This is a standalone GraphQL export flow that mirrors export-migrations.ts
 * but fetches all data via GraphQL queries instead of direct SQL.
 * 
 * Per Dan's guidance: "I would NOT do branching in those existing files.
 * I would make the GraphQL flow its entire own flow at first."
 */
import { toSnakeCase } from 'komoji';
import { mkdirSync, rmSync } from 'fs';
import { sync as glob } from 'glob';
import path from 'path';

import { Inquirerer } from 'inquirerer';

import { PgpmPackage } from '../core/class/pgpm';
import { PgpmRow, SqlWriteOptions, writePgpmFiles, writePgpmPlan } from '../files';
import { getMissingInstallableModules } from '../modules/modules';
import { parseAuthor } from '../utils/author';
import { GraphQLClient } from './graphql-client';
import { exportGraphQLMeta } from './export-graphql-meta';
import { graphqlRowToPostgresRow } from './graphql-naming';

/**
 * Required extensions for database schema exports.
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
 */
const SERVICE_REQUIRED_EXTENSIONS = [
  'plpgsql',
  'metaschema-schema',
  'metaschema-modules',
  'services'
] as const;


interface MissingModulesResult {
  missingModules: { controlName: string; npmName: string }[];
  shouldInstall: boolean;
}

const detectMissingModules = async (
  project: PgpmPackage,
  extensions: string[],
  prompter?: Inquirerer,
  argv?: Record<string, any>
): Promise<MissingModulesResult> => {
  const installed = project.getWorkspaceInstalledModules();
  const missingModules = getMissingInstallableModules(extensions, installed);

  if (missingModules.length === 0) {
    return { missingModules: [], shouldInstall: false };
  }

  const missingNames = missingModules.map(m => m.npmName);
  console.log(`\nMissing pgpm modules detected: ${missingNames.join(', ')}`);

  if (prompter) {
    const { install } = await prompter.prompt(argv || {} as Record<string, any>, [
      {
        type: 'confirm',
        name: 'install',
        message: `Install missing modules (${missingNames.join(', ')})?`,
        default: true,
        useDefault: true
      }
    ]);

    return { missingModules, shouldInstall: install };
  }

  return { missingModules, shouldInstall: false };
};

const installMissingModules = async (
  moduleDir: string,
  missingModules: { controlName: string; npmName: string }[]
): Promise<void> => {
  if (missingModules.length === 0) return;

  const missingNames = missingModules.map(m => m.npmName);
  console.log('Installing missing modules...');

  const moduleProject = new PgpmPackage(moduleDir);
  await moduleProject.installModules(...missingNames);

  console.log('Modules installed successfully.');
};

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

interface PreparePackageOptions {
  project: PgpmPackage;
  author: string;
  outdir: string;
  name: string;
  description: string;
  extensions: string[];
  prompter?: Inquirerer;
  repoName?: string;
  username?: string;
}

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

    // If username is provided, run non-interactively with all answers pre-filled.
    // Otherwise, let the prompter ask for it.
    const knownUsername = username || undefined;

    await project.initModule({
      name,
      description,
      author,
      extensions,
      outputDir: outdir,
      noTty: !prompter || !!knownUsername,
      prompter,
      answers: {
        moduleName: name,
        moduleDesc: description,
        access: 'restricted',
        license: 'CLOSED',
        fullName,
        ...(email && { email }),
        repoName: repoName || name,
        ...(knownUsername && { username: knownUsername })
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

// =============================================================================
// Public API
// =============================================================================

export interface ExportGraphQLOptions {
  project: PgpmPackage;
  /** GraphQL endpoint for metaschema/services data (e.g. http://private.localhost:3002/graphql) */
  metaEndpoint: string;
  /** GraphQL endpoint for db_migrate data (e.g. http://db_migrate.localhost:3000/graphql) */
  migrateEndpoint?: string;
  /** Bearer token for authentication */
  token?: string;
  /** Database ID to export */
  databaseId: string;
  /** Database display name */
  databaseName: string;
  /** Schema names selected for export */
  schema_names: string[];
  /** Schema rows (with name and schema_name) for the replacer */
  schemas: Schema[];
  /** Author string */
  author: string;
  /** Output directory for packages */
  outdir: string;
  /** Extension name for the DB module */
  extensionName: string;
  /** Description for the DB extension */
  extensionDesc?: string;
  /** Extension name for the service/meta module */
  metaExtensionName: string;
  /** Description for the service/meta extension */
  metaExtensionDesc?: string;
  prompter?: Inquirerer;
  argv?: Record<string, any>;
  repoName?: string;
  username?: string;
  serviceOutdir?: string;
  skipSchemaRenaming?: boolean;
}

export const exportGraphQL = async ({
  project,
  metaEndpoint,
  migrateEndpoint,
  token,
  databaseId,
  databaseName,
  schema_names,
  schemas,
  author,
  outdir,
  extensionName,
  extensionDesc,
  metaExtensionName,
  metaExtensionDesc,
  prompter,
  argv,
  repoName,
  username,
  serviceOutdir,
  skipSchemaRenaming = false
}: ExportGraphQLOptions): Promise<void> => {
  outdir = outdir + '/';
  const svcOutdir = (serviceOutdir || outdir.slice(0, -1)) + '/';

  const name = extensionName;

  const schemasForReplacement = skipSchemaRenaming
    ? []
    : schemas.filter((schema) => schema_names.includes(schema.schema_name));

  const { replacer } = makeReplacer({
    schemas: schemasForReplacement,
    name
  });

  // =========================================================================
  // 1. Fetch sql_actions via GraphQL (db_migrate endpoint)
  // =========================================================================
  let sqlActionRows: Record<string, unknown>[] = [];

  if (migrateEndpoint) {
    console.log(`Fetching sql_actions from ${migrateEndpoint}...`);
    const migrateClient = new GraphQLClient({ endpoint: migrateEndpoint, token });

    try {
      const rawRows = await migrateClient.fetchAllNodes(
        'sqlActions',
        'id\ndatabaseId\nname\ndeploy\nrevert\nverify\ncontent\ndeps\naction\nactionId\nactorId\npayload',
        { databaseId }
      );

      sqlActionRows = rawRows.map(graphqlRowToPostgresRow);
      console.log(`  Found ${sqlActionRows.length} sql_actions`);
    } catch (err) {
      console.warn(`  Warning: Could not fetch sql_actions: ${err instanceof Error ? err.message : err}`);
    }
  } else {
    console.log('No migrate endpoint provided, skipping sql_actions export.');
  }

  const opts: SqlWriteOptions = {
    name,
    replacer,
    outdir,
    author
  };

  const dbExtensionDesc = extensionDesc || `${name} database schema for ${databaseName}`;

  if (sqlActionRows.length > 0) {
    const dbMissingResult = await detectMissingModules(project, [...DB_REQUIRED_EXTENSIONS], prompter, argv);

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

    if (dbMissingResult.shouldInstall) {
      await installMissingModules(dbModuleDir, dbMissingResult.missingModules);
    }

    writePgpmPlan(sqlActionRows as unknown as PgpmRow[], opts);
    writePgpmFiles(sqlActionRows as unknown as PgpmRow[], opts);
  } else {
    console.log('No sql_actions found. Skipping database module export.');
  }

  // =========================================================================
  // 2. Fetch meta/services data via GraphQL
  // =========================================================================
  console.log(`Fetching metadata from ${metaEndpoint}...`);
  const metaClient = new GraphQLClient({ endpoint: metaEndpoint, token });

  const metaResult = await exportGraphQLMeta({
    client: metaClient,
    database_id: databaseId
  });

  const metaTableCount = Object.keys(metaResult).length;
  console.log(`  Fetched ${metaTableCount} meta tables with data`);

  if (metaTableCount > 0) {
    const metaDesc = metaExtensionDesc || `${metaExtensionName} service utilities for managing domains, APIs, and services`;

    const svcMissingResult = await detectMissingModules(project, [...SERVICE_REQUIRED_EXTENSIONS], prompter, argv);

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

    if (svcMissingResult.shouldInstall) {
      await installMissingModules(svcModuleDir, svcMissingResult.missingModules);
    }

    const metaSchemasForReplacement = skipSchemaRenaming
      ? []
      : schemas.filter((schema) => schema_names.includes(schema.schema_name));

    const metaReplacer = makeReplacer({
      schemas: metaSchemasForReplacement,
      name: metaExtensionName
    });

    const metaPackage: PgpmRow[] = [];

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
      'default_privilege',
      'database_extension',
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
      'sessions_module',
      'secrets_module',
      'profiles_module',
      'encrypted_secrets_module',
      'connected_accounts_module',
      'phone_numbers_module',
      'crypto_addresses_module',
      'crypto_auth_module',
      'field_module',
      'table_template_module',
      'secure_table_provision',
      'user_profiles_module',
      'user_settings_module',
      'organization_settings_module',
      'uuid_module',
      'default_ids_module',
      'denormalized_table_field'
    ];

    const tablesWithContent: string[] = [];

    for (const tableName of tableOrder) {
      const tableSql = metaResult[tableName];
      if (tableSql) {
        const replacedSql = metaReplacer.replacer(tableSql);

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

  console.log('GraphQL export complete.');
};
