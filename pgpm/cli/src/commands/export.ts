import { exportMigrations,PgpmPackage } from '@pgpmjs/core';
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
  --author <name>         Project author (default: from git config)
  --extensionName <name>  Extension name
  --metaExtensionName <name>  Meta extension name (default: svc)
  --cwd <directory>       Working directory (default: current directory)

Examples:
  pgpm export              Export migrations from selected database
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

  const { database_ids: selectedDatabaseName } = await prompter.prompt({} as any, [
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

  const { schema_names } = await prompter.prompt({} as any, [
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
    prompter
  });

  prompter.close();

  console.log(`

        |||
       (o o)
   ooO--(_)--Ooo-

✨ finished!
`);
};
