/**
 * GraphQL-based export orchestrator.
 * 
 * This is a standalone GraphQL export flow that mirrors export-migrations.ts
 * but fetches all data via GraphQL queries instead of direct SQL.
 * 
 * Per Dan's guidance: "I would NOT do branching in those existing files.
 * I would make the GraphQL flow its entire own flow at first."
 */
import { Inquirerer } from 'inquirerer';

import { createClient as createMigrateClient } from '@pgpmjs/migrate-client';

import { PgpmPackage, PgpmRow, SqlWriteOptions, writePgpmFiles, writePgpmPlan } from '@pgpmjs/core';
import { GraphQLClient } from './graphql-client';
import { exportGraphQLMeta } from './export-graphql-meta';
import { graphqlRowToPostgresRow } from './graphql-naming';
import {
  DB_REQUIRED_EXTENSIONS,
  SERVICE_REQUIRED_EXTENSIONS,
  META_COMMON_HEADER,
  META_COMMON_FOOTER,
  META_TABLE_ORDER,
  Schema,
  detectMissingModules,
  installMissingModules,
  makeReplacer,
  preparePackage,
  normalizeOutdir
} from './export-utils';

// =============================================================================
// Public API
// =============================================================================

export interface ExportGraphQLOptions {
  project: PgpmPackage;
  /** GraphQL endpoint for metaschema/services data (e.g. http://private.localhost:3002/graphql) */
  metaEndpoint: string;
  /** GraphQL endpoint for db_migrate data (e.g. http://db_migrate.localhost:3000/graphql) */
  migrateEndpoint?: string;
  /** Extra headers for the migrate endpoint (e.g. Host header for subdomain routing) */
  migrateHeaders?: Record<string, string>;
  /** Bearer token for authentication */
  token?: string;
  /** Extra headers to send with GraphQL requests (e.g. X-Meta-Schema) */
  headers?: Record<string, string>;
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
  headers,
  migrateHeaders,
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
  const normalizedOutdir = normalizeOutdir(outdir);
  const svcOutdir = normalizeOutdir(serviceOutdir || outdir);

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
    const migrateDb = createMigrateClient({
      endpoint: migrateEndpoint,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...migrateHeaders,
      },
    });

    try {
      const allNodes: Record<string, unknown>[] = [];
      let hasNextPage = true;
      let afterCursor: string | undefined;

      while (hasNextPage) {
        const result = await migrateDb.sqlAction.findMany({
          select: {
            id: true,
            databaseId: true,
            name: true,
            deploy: true,
            revert: true,
            verify: true,
            content: true,
            deps: true,
            action: true,
            actionId: true,
            actorId: true,
            payload: true,
          },
          where: { databaseId: { equalTo: databaseId } },
          first: 100,
          ...(afterCursor ? { after: afterCursor } : {}),
        }).unwrap();

        allNodes.push(
          ...result.sqlActions.nodes.map(node =>
            graphqlRowToPostgresRow(node as Record<string, unknown>)
          )
        );
        hasNextPage = result.sqlActions.pageInfo.hasNextPage;
        afterCursor = result.sqlActions.pageInfo.endCursor ?? undefined;
      }

      sqlActionRows = allNodes;
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
    outdir: normalizedOutdir,
    author
  };

  const dbExtensionDesc = extensionDesc || `${name} database schema for ${databaseName}`;

  if (sqlActionRows.length > 0) {
    const dbMissingResult = await detectMissingModules(project, [...DB_REQUIRED_EXTENSIONS], prompter, argv);

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
  const metaClient = new GraphQLClient({ endpoint: metaEndpoint, token, headers });

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
      name: metaExtensionName,
      // Use extensionName for schema prefix — the services metadata references
      // schemas owned by the application package (e.g. agent_db_auth_public),
      // not the services package (agent_db_services_auth_public)
      schemaPrefix: name
    });

    const metaPackage: PgpmRow[] = [];

    const tablesWithContent: string[] = [];

    for (const tableName of META_TABLE_ORDER) {
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
  }

  console.log('GraphQL export complete.');
};
