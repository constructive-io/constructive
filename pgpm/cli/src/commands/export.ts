import { exportMigrations, exportGraphQL, GraphQLClient, PgpmPackage, graphqlRowToPostgresRow } from '@pgpmjs/core';
import { getEnvOptions } from '@pgpmjs/env';
import { getGitConfigInfo } from '@pgpmjs/types';
import { CLIOptions, Inquirerer } from 'inquirerer';
import { resolve } from 'path';
import { getPgPool } from 'pg-cache';

const exportUsageText = `
Export Command:

  pgpm export [OPTIONS]

  Export database migrations from existing databases.

Options:
  --help, -h              Show this help message
  --graphql-endpoint <url>   GraphQL endpoint for meta/services data (enables GraphQL mode)
  --migrate-endpoint <url>   GraphQL endpoint for db_migrate data (optional, for sql_actions)
  --migrate-host <host>      Host header for migrate endpoint (e.g. db_migrate.localhost:3000)
  --token <token>            Bearer token for GraphQL authentication
  --author <name>         Project author (default: from git config)
  --extensionName <name>  Extension name
  --metaExtensionName <name>  Meta extension name (default: svc)
  --cwd <directory>       Working directory (default: current directory)

Examples:
  pgpm export              Export migrations from selected database (SQL mode)
  pgpm export --graphql-endpoint 'http://[::1]:3002/graphql' --migrate-endpoint 'http://[::1]:3000/graphql' --migrate-host db_migrate.localhost:3000
`;

export default async (
  argv: Partial<Record<string, any>>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  // Show usage if explicitly requested
  if (argv.help || argv.h) {
    console.log(exportUsageText);
    process.exit(0);
  }
  const { email, username } = getGitConfigInfo();
  const cwd = argv.cwd ?? process.cwd();
  const project = new PgpmPackage(cwd);

  project.ensureWorkspace();
  project.resetCwd(project.workspacePath);

  const graphqlEndpoint = argv['graphql-endpoint'] || argv.graphqlEndpoint;
  const migrateEndpoint = argv['migrate-endpoint'] || argv.migrateEndpoint;
  const migrateHost = argv['migrate-host'] || argv.migrateHost;
  const token = argv.token;

  if (graphqlEndpoint) {
    // =========================================================================
    // GraphQL export mode
    // =========================================================================
    console.log(`GraphQL export mode: ${graphqlEndpoint}`);

    const metaClient = new GraphQLClient({
      endpoint: graphqlEndpoint,
      token,
      headers: { 'X-Meta-Schema': 'true' }
    });

    // Fetch databases via GraphQL
    const dbRows = await metaClient.fetchAllNodes<{ id: string; name: string }>(
      'databases',
      'id\nname'
    );

    if (!dbRows.length) {
      console.log('No databases found via GraphQL.');
      prompter.close();
      return;
    }

    const { database_ids: selectedDatabaseName } = await prompter.prompt(argv, [
      {
        type: 'list',
        name: 'database_ids',
        message: 'Select database',
        options: dbRows.map(db => db.name),
        required: true
      }
    ]);

    const selectedDatabase = dbRows.find(db => db.name === selectedDatabaseName);
    if (!selectedDatabase) {
      console.log('Database not found.');
      prompter.close();
      return;
    }

    const databaseId = selectedDatabase.id;

    const { author, extensionName, metaExtensionName } = await prompter.prompt(argv, [
      {
        type: 'text',
        name: 'author',
        message: 'Project author',
        default: `${username} <${email}>`,
        required: true
      },
      {
        type: 'text',
        name: 'extensionName',
        message: 'Extension name',
        default: selectedDatabaseName,
        required: true
      },
      {
        type: 'text',
        name: 'metaExtensionName',
        message: 'Meta extension name',
        default: `${selectedDatabaseName}-service`,
        required: true
      }
    ]);

    // Fetch schemas via GraphQL
    const schemaRows = await metaClient.fetchAllNodes<{ id: string; schemaName: string; name: string }>(
      'schemas',
      'id\nschemaName\nname',
      { databaseId }
    );

    // Convert camelCase to snake_case for schema rows
    const pgSchemaRows = schemaRows.map(s => graphqlRowToPostgresRow(s)) as Array<{ id: string; schema_name: string; name: string }>;

    // Normalize comma-separated schema_names string into an array for checkbox override
    if (typeof argv.schema_names === 'string') {
      argv.schema_names = argv.schema_names.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    const { schema_names } = await prompter.prompt(argv, [
      {
        type: 'checkbox',
        name: 'schema_names',
        message: 'Select schema_name(s)',
        options: pgSchemaRows.map(s => s.schema_name),
        default: pgSchemaRows.map(s => s.schema_name),
        required: true
      }
    ]);

    const outdir = resolve(project.workspacePath, 'packages/');

    await exportGraphQL({
      project,
      metaEndpoint: graphqlEndpoint,
      migrateEndpoint,
      migrateHeaders: migrateHost ? { Host: migrateHost } : undefined,
      token,
      headers: { 'X-Meta-Schema': 'true' },
      databaseId,
      databaseName: selectedDatabaseName,
      schema_names,
      schemas: pgSchemaRows,
      author,
      outdir,
      extensionName,
      metaExtensionName,
      prompter,
      argv,
      username
    });
  } else {
    // =========================================================================
    // SQL export mode (original behavior)
    // =========================================================================
    const options = getEnvOptions(); 

    const db = await getPgPool({
      database: 'postgres'
    });

    const databasesResult = await db.query(`
      SELECT datname FROM pg_catalog.pg_database
      WHERE datistemplate = FALSE AND datname NOT IN ('postgres')
        AND datname !~ '^pg_';
    `);

    const { databases: dbname } = await prompter.prompt(argv, [
      {
        type: 'list',
        name: 'databases',
        message: 'Select a database',
        options: databasesResult.rows.map(row => row.datname),
        required: true
      }
    ]);
    const selectedDb = await getPgPool({
      database: dbname
    });

    const dbsResult = await selectedDb.query(`
      SELECT id, name FROM metaschema_public.database;
    `);

    const { database_ids: selectedDatabaseName } = await prompter.prompt(argv, [
      {
        type: 'list',
        name: 'database_ids',
        message: 'Select database_id',
        options: dbsResult.rows.map(db => db.name),
        required: true
      }
    ]);

    const selectedDatabase = dbsResult.rows.find(db => db.name === selectedDatabaseName);

    const dbInfo = {
      dbname,
      databaseName: selectedDatabaseName,
      database_ids: [selectedDatabase!.id]
    };

    const { author, extensionName, metaExtensionName } = await prompter.prompt(argv, [
      {
        type: 'text',
        name: 'author',
        message: 'Project author',
        default: `${username} <${email}>`,
        required: true
      },
      {
        type: 'text',
        name: 'extensionName',
        message: 'Extension name',
        default: selectedDatabaseName || dbname,
        required: true
      },
      {
        type: 'text',
        name: 'metaExtensionName',
        message: 'Meta extension name',
        default: `${selectedDatabaseName || dbname}-service`,
        required: true
      }
    ]);

    const schemasResult = await selectedDb.query(
      `SELECT * FROM metaschema_public.schema WHERE database_id = $1`,
      [dbInfo.database_ids[0]]
    );

    // Normalize comma-separated schema_names string into an array for checkbox override
    if (typeof argv.schema_names === 'string') {
      argv.schema_names = argv.schema_names.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    const { schema_names } = await prompter.prompt(argv, [
      {
        type: 'checkbox',
        name: 'schema_names',
        message: 'Select schema_name(s)',
        options: schemasResult.rows.map(s => s.schema_name),
        default: schemasResult.rows.map(s => s.schema_name),
        required: true
      }
    ]);

    const outdir = resolve(project.workspacePath, 'packages/');
    
    await exportMigrations({
      project,
      options,
      dbInfo,
      author,
      schema_names,
      outdir,
      extensionName,
      metaExtensionName,
      prompter,
      argv,
      username
    });
  }

  prompter.close();

  console.log(`

        |||
       (o o)
   ooO--(_)--Ooo-

✨ finished!
`);
};
