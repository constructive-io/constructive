import { getEnvOptions } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import { ConstructivePreset, makePgService } from 'graphile-settings';
import { makeSchema } from 'graphile-build';
import { buildConnectionString, getPgPool } from 'pg-cache';
import { printSchema } from 'graphql';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { GraphileConfig } from 'graphile-config';

const log = new Logger('codegen-schema');

const getSchemaOutputPath = () =>
  process.env.CODEGEN_SCHEMA_OUT ??
  path.resolve(__dirname, '../../codegen/schema.graphql');

(async () => {
  try {
    const opts = getEnvOptions();
    const apiOpts = (opts as any).api || {};
    const metaSchemas = Array.isArray(apiOpts.metaSchemas)
      ? apiOpts.metaSchemas
      : [];

    let schemas: string[];
    let usingFallback = false;

    const dbName =
      process.env.CODEGEN_DATABASE || process.env.PGDATABASE || 'constructive';
    const pgConfig = { ...opts.pg, database: dbName } as typeof opts.pg;
    log.info(`Target database for codegen: ${dbName}`);

    if (metaSchemas.length) {
      schemas = metaSchemas;
      log.info(`Using meta schemas: ${schemas.join(', ')}`);

      const pool = getPgPool(pgConfig);
      const checkResult = await pool.query(
        `SELECT schema_name FROM information_schema.schemata
         WHERE schema_name = ANY($1::text[])
         ORDER BY schema_name`,
        [schemas]
      );

      const foundSchemas = checkResult.rows.map((r: any) => r.schema_name);
      const missing = schemas.filter((s) => !foundSchemas.includes(s));

      if (missing.length > 0) {
        log.warn(
          `Missing schemas: ${missing.join(', ')}. Falling back to 'public'.`
        );
        schemas = ['public'];
        usingFallback = true;
      }
    } else {
      schemas = ['public'];
      log.info('No meta schemas configured, using: public');
      usingFallback = true;
    }

    if (usingFallback) {
      log.warn(
        'Schema will be generated from public schema only. To generate full meta schema, ensure meta tables exist.'
      );
    }

    const pool = getPgPool(pgConfig);
    log.debug(`Connecting to database: ${dbName}`);
    log.debug(`Connecting to host: ${opts.pg?.host || '(default)'}`);

    const dbInfo = await pool.query(
      'SELECT current_database() AS current_database, current_user AS current_user'
    );
    log.info(
      `Connected to database: ${dbInfo.rows[0]?.current_database} as user: ${dbInfo.rows[0]?.current_user}`
    );

    const connectionString = buildConnectionString(
      pgConfig.user, pgConfig.password, pgConfig.host, pgConfig.port, dbName
    );

    // Create v5 preset with ConstructivePreset
    const preset: GraphileConfig.Preset = {
      extends: [ConstructivePreset],
      pgServices: [
        makePgService({
          connectionString,
          schemas,
        }),
      ],
    };

    const { schema: graphqlSchema } = await makeSchema(preset);
    const sdl = printSchema(graphqlSchema);

    const outputPath = getSchemaOutputPath();
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, sdl, 'utf8');

    log.success(`Schema written to ${outputPath}`);
  } catch (error: any) {
    log.error('Failed to write schema', error?.stack || error);
    process.exitCode = 1;
  }
})();
