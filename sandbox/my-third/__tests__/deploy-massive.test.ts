import { deployFast, PgpmPackage } from '@pgpmjs/core';
import { getEnvOptions } from '@pgpmjs/env';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

it('dashboard', async () => {
    const project = new PgpmPackage(process.env.CONSTRUCTIVE_DASHBOARD);
    const opts = getEnvOptions({
        pg: {
            database: 'db-dbe-'+randomUUID()
        }
    })
    execSync(`createdb ${opts.pg.database}`);
    await deployFast({
        opts, 
        name: 'dashboard', 
        database: opts.pg.database, 
        dir: project.modulePath,
        usePlan: true,
        verbose: false
    });
});

it('Constructive', async () => {
    const project = new PgpmPackage(process.env.CONSTRUCTIVE_WORKSPACE);
    const opts = getEnvOptions({
        pg: {
            database: 'db-constructive-'+randomUUID()
        }
    })
    execSync(`createdb ${opts.pg.database}`);
    await deployFast({
        opts, 
        name: 'dbs', 
        database: opts.pg.database, 
        dir: project.modulePath,
        usePlan: true,
        verbose: false
    });
});
