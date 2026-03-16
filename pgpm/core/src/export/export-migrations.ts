import { PgpmOptions } from '@pgpmjs/types';
import { Inquirerer } from 'inquirerer';
import { getPgPool } from 'pg-cache';

import { PgpmPackage } from '../core/class/pgpm';
import { PgpmRow, SqlWriteOptions, writePgpmFiles, writePgpmPlan } from '../files';
import { exportMeta } from './export-meta';
import {
  DB_REQUIRED_EXTENSIONS,
  SERVICE_REQUIRED_EXTENSIONS,
  META_COMMON_HEADER,
  META_COMMON_FOOTER,
  META_TABLE_ORDER,
  detectMissingModules,
  installMissingModules,
  makeReplacer,
  preparePackage,
  normalizeOutdir
} from './export-utils';

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
  prompter?: Inquirerer;
  argv?: Record<string, any>;
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
  prompter?: Inquirerer;
  argv?: Record<string, any>;
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
  argv,
  repoName,
  username,
  serviceOutdir,
  skipSchemaRenaming = false
}: ExportMigrationsToDiskOptions): Promise<void> => {
  const normalizedOutdir = normalizeOutdir(outdir);
  // Use serviceOutdir for service module, defaulting to outdir if not provided
  const svcOutdir = normalizeOutdir(serviceOutdir || outdir);

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
    outdir: normalizedOutdir,
    author
  };

  // Build description for the database extension package
  const dbExtensionDesc = extensionDesc || `${name} database schema for ${databaseName}`;

  if (results?.rows?.length > 0) {
    // Detect missing modules at workspace level and prompt user
    const dbMissingResult = await detectMissingModules(project, [...DB_REQUIRED_EXTENSIONS], prompter, argv);

    // Create/prepare the module directory
    const dbModuleDir = await preparePackage({
      project,
      author,
      outdir: normalizedOutdir,
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
  } else {
    console.log('No sql_actions found — skipping database module. Meta/service module will still be exported.');
  }

  // =========================================================================
  // Meta/service module export — runs independently of sql_actions
  // =========================================================================

  const metaResult = await exportMeta({
    opts: options,
    dbname: database,
    database_id: databaseId
  });

  // Build description for the meta/service extension package
  const metaDesc = metaExtensionDesc || `${metaExtensionName} service utilities for managing domains, APIs, and services`;

  // Detect missing modules at workspace level and prompt user
  const svcMissingResult = await detectMissingModules(project, [...SERVICE_REQUIRED_EXTENSIONS], prompter, argv);

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
    name: metaExtensionName,
      // Use extensionName for schema prefix — the services metadata references
      // schemas owned by the application package (e.g. agent_db_auth_public),
      // not the services package (agent_db_services_auth_public)
      schemaPrefix: name
  });

  // Create separate files for each table type
  const metaPackage: PgpmRow[] = [];


  // Track which tables have content for dependency resolution
  const tablesWithContent: string[] = [];

  // Create a file for each table type that has content
  for (const tableName of META_TABLE_ORDER) {
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
        content: `${META_COMMON_HEADER}

${replacedSql}

${META_COMMON_FOOTER}
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
  argv,
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
      argv,
      repoName,
      username,
      serviceOutdir,
      skipSchemaRenaming
    });
  }
};
