import { PgpmOptions } from '@pgpmjs/types';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { sync as glob } from 'glob';
import { toSnakeCase } from 'komoji';
import path from 'path';
import { getPgPool } from 'pg-cache';

import { PgpmPackage } from '../core/class/pgpm';
import { PgpmRow, SqlWriteOptions, writePgpmFiles, writePgpmPlan } from '../files';
import { exportMeta } from './export-meta';

/**
 * Mapping from control file names (used in extensions list) to npm package names.
 * Only includes modules that can be installed via pgpm install from @pgpm/* packages.
 * Native PostgreSQL extensions (plpgsql, uuid-ossp, etc.) are not included.
 */
const PGPM_MODULE_MAP: Record<string, string> = {
  'pgpm-base32': '@pgpm/base32',
  'pgpm-database-jobs': '@pgpm/database-jobs',
  'db-meta-modules': '@pgpm/db-meta-modules',
  'db-meta-schema': '@pgpm/db-meta-schema',
  'pgpm-inflection': '@pgpm/inflection',
  'pgpm-jwt-claims': '@pgpm/jwt-claims',
  'pgpm-stamps': '@pgpm/stamps',
  'pgpm-totp': '@pgpm/totp',
  'pgpm-types': '@pgpm/types',
  'pgpm-utils': '@pgpm/utils',
  'pgpm-uuid': '@pgpm/uuid'
};

/**
 * Prompter interface for interactive prompts.
 * Compatible with Inquirerer from the CLI.
 */
interface Prompter {
  prompt: (argv: any, questions: any[]) => Promise<Record<string, any>>;
}

/**
 * Checks which pgpm modules from the extensions list are missing from the workspace
 * and prompts the user to install them if a prompter is provided.
 * 
 * @param project - The PgpmPackage instance
 * @param extensions - List of extension names (control file names)
 * @param prompter - Optional prompter for interactive confirmation
 * @returns List of extensions that were successfully installed
 */
const checkAndInstallMissingModules = async (
  project: PgpmPackage,
  extensions: string[],
  prompter?: Prompter
): Promise<string[]> => {
  const moduleMap = project.getModuleMap();
  const availableModules = Object.keys(moduleMap);
  
  const missingPgpmModules: { controlName: string; npmName: string }[] = [];
  
  for (const ext of extensions) {
    if (PGPM_MODULE_MAP[ext] && !availableModules.includes(ext)) {
      missingPgpmModules.push({
        controlName: ext,
        npmName: PGPM_MODULE_MAP[ext]
      });
    }
  }
  
  if (missingPgpmModules.length === 0) {
    return [];
  }
  
  const missingNames = missingPgpmModules.map(m => m.npmName);
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
    
    if (install) {
      console.log('Installing missing modules...');
      await project.installModules(...missingNames);
      console.log('Modules installed successfully.');
      return missingPgpmModules.map(m => m.controlName);
    }
  }
  
  return [];
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
  prompter
}: ExportMigrationsToDiskOptions): Promise<void> => {
  outdir = outdir + '/';

  const pgPool = getPgPool({
    ...options.pg,
    database
  });

  const db = await pgPool.query(
    `select * from collections_public.database where id=$1`,
    [databaseId]
  );

  const schemas = await pgPool.query(
    `select * from collections_public.schema where database_id=$1`,
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

  const { replace, replacer } = makeReplacer({
    schemas: schemas.rows.filter((schema: any) =>
      schema_names.includes(schema.schema_name)
    ),
    name
  });

  const results = await pgPool.query(
    `select * from db_migrate.sql_actions order by id`
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
    const dbExtensions = [
      'plpgsql',
      'uuid-ossp',
      'citext',
      'pgcrypto',
      'btree_gist',
      'postgis',
      'hstore',
      'db-meta-schema',
      'pgpm-inflection',
      'pgpm-uuid',
      'pgpm-utils',
      'pgpm-database-jobs',
      'pgpm-jwt-claims',
      'pgpm-stamps',
      'pgpm-base32',
      'pgpm-totp',
      'pgpm-types'
    ];

    await checkAndInstallMissingModules(project, dbExtensions, prompter);

    await preparePackage({
      project,
      author,
      outdir,
      name,
      description: dbExtensionDesc,
      extensions: dbExtensions,
      prompter
    });

    writePgpmPlan(results.rows, opts);
    writePgpmFiles(results.rows, opts);

    let meta = await exportMeta({
      opts: options,
      dbname: database,
      database_id: databaseId
    });

    meta = replacer(meta);

    // Build description for the meta/service extension package
    const metaDesc = metaExtensionDesc || `${metaExtensionName} service utilities for managing domains, APIs, and services`;

    const metaExtensions = ['plpgsql', 'db-meta-schema', 'db-meta-modules'];
    await checkAndInstallMissingModules(project, metaExtensions, prompter);

    await preparePackage({
      project,
      author,
      outdir,
      name: metaExtensionName,
      description: metaDesc,
      extensions: metaExtensions,
      prompter
    });

    const metaReplacer = makeReplacer({
      schemas: schemas.rows.filter((schema: any) =>
        schema_names.includes(schema.schema_name)
      ),
      name: metaExtensionName
    });

    const metaPackage: PgpmRow[] = [
      {
        deps: [],
        deploy: 'migrate/meta',
        content: `SET session_replication_role TO replica;
-- using replica in case we are deploying triggers to collections_public

-- unaccent, postgis affected and require grants
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public to public;

DO $LQLMIGRATION$
  DECLARE
  BEGIN
  
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_user');
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_admin');

  END;
$LQLMIGRATION$;

${meta}

-- TODO: Research needed - These UPDATE statements may be a security leak.
-- They appear to rebind exported metadata to the target database after import,
-- but exposing dbname in meta_public tables could leak internal database names.
-- Consider removing entirely or gating behind an explicit flag.
-- UPDATE meta_public.apis
--       SET dbname = current_database() WHERE TRUE;

-- UPDATE meta_public.sites
--       SET dbname = current_database() WHERE TRUE;

SET session_replication_role TO DEFAULT;
`
      }
    ];

    opts.replacer = metaReplacer.replacer;
    opts.name = metaExtensionName;

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
  prompter
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
      prompter
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
 */
const preparePackage = async ({
  project,
  author,
  outdir,
  name,
  description,
  extensions,
  prompter
}: PreparePackageOptions): Promise<void> => {
  const curDir = process.cwd();
  const pgpmDir = path.resolve(path.join(outdir, name));
  mkdirSync(pgpmDir, { recursive: true });
  process.chdir(pgpmDir);

  const plan = glob(path.join(pgpmDir, 'pgpm.plan'));
  if (!plan.length) {
    await project.initModule({
      name,
      description,
      author,
      extensions,
      answers: {
        moduleName: name,
        moduleDesc: description,
        access: 'restricted',
        license: 'CLOSED'
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
