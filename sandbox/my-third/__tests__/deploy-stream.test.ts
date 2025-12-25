import { deployStream, PgpmPackage } from '@pgpmjs/core';
import { getEnvOptions } from '@pgpmjs/env';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { resolve } from 'path';
import { getPgPool } from 'pg-cache';

it('Constructive', async () => {
    const db = 'db-'+randomUUID();
    const project = new PgpmPackage(resolve(__dirname+'/../'));
    const opts = getEnvOptions({
        pg: {
            database: db
        }
    })
    execSync(`createdb ${opts.pg.database}`);
    await deployStream({
        opts, 
        name: 'my-third', 
        database: opts.pg.database, 
        dir: project.modulePath,
        usePlan: true,
        verbose: false
    });

    const pgPool = getPgPool({ ...opts.pg, database: db });
    await pgPool.end();
});
