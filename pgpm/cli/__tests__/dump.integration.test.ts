
import fs from 'fs';
import path from 'path';
import { teardownPgPools, getPgPool } from 'pg-cache';
import { getPgEnvOptions } from 'pg-env';
import { CLIDeployTestFixture } from '../test-utils';

jest.setTimeout(30000);

const DATABASE_ID_1 = '00000000-0000-0000-0000-000000000001';
const DATABASE_ID_2 = '00000000-0000-0000-0000-000000000002';

describe('CLI Dump Integration', () => {
    let fixture: CLIDeployTestFixture;
    let testDb: any;
    let dumpFile: string;

    beforeAll(async () => {
        // using 'sqitch' and 'simple' fixtures just to get a valid environment setup
        fixture = new CLIDeployTestFixture('sqitch', 'simple-w-tags');
    });

    beforeEach(async () => {
        testDb = await fixture.setupTestDatabase();
        // Unique dump file for each test
        dumpFile = path.join(process.cwd(), `test-dump-${testDb.name}.sql`);

        const pool = getPgPool(getPgEnvOptions({ database: testDb.name }));

        // Setup generic schema for testing dump
        await pool.query('create schema if not exists metaschema_public');
        await pool.query('create schema if not exists public');
        await pool.query(`
      create table if not exists metaschema_public.database (
        id uuid primary key,
        name text not null
      )
    `);
        // Insert some databases
        await pool.query(`
      insert into metaschema_public.database (id, name) values
      ('${DATABASE_ID_1}', 'tenant1'),
      ('${DATABASE_ID_2}', 'tenant2')
    `);

        // Setup data table with database_id
        // Make sure we have permissions
        await pool.query(`
      create table public.items (
        id serial primary key,
        name text,
        database_id uuid
      )
    `);
        await pool.query(`
      insert into public.items (name, database_id) values
      ('item1', '${DATABASE_ID_1}'),
      ('item2', '${DATABASE_ID_2}')
    `);
    });

    afterEach(async () => {
        if (fs.existsSync(dumpFile)) fs.unlinkSync(dumpFile);
    });

    afterAll(async () => {
        await fixture.cleanup();
        await teardownPgPools();
    });

    it('should execute pgpm dump command via CLI fixture', async () => {
        // We invoke "pgpm dump" using the test fixture's runTerminalCommands logic
        // This goes through the same parsing logic as other commands
        // BUT we must remember that "dump" relies on spawning "pg_dump".
        // Since CLIDeployTestFixture runs commands in-process via src/commands.ts, 
        // the "internal" logic is executed within *this* process.
        // The "dump" command does `spawn('pg_dump')`.
        // Since we are NOT mocking spawn here (unlike dump.test.ts), it will try to run real pg_dump.
        // This is exactly what we want for integration test.

        const cmd = `pgpm dump --database ${testDb.name} --database-id ${DATABASE_ID_1} --out ${dumpFile} --yes`;

        // We pass executeCommands=true
        await fixture.runTerminalCommands(cmd, {}, true);

        // Now verify the file exists and has content
        expect(fs.existsSync(dumpFile)).toBe(true);
        const content = fs.readFileSync(dumpFile, 'utf8');

        // Basic PG Dump checks
        expect(content).toContain('PostgreSQL database dump');
        expect(content).toContain('COPY public.items');
        expect(content).toContain('item1');
        expect(content).toContain('item2');

        // Prune logic checks
        expect(content).toContain('-- pgpm dump prune');
        expect(content).toContain(`delete from "public"."items" where database_id <>`);
        expect(content).toContain(`'${DATABASE_ID_1}'`);
        expect(content).toContain(`delete from metaschema_public.database where id <> '${DATABASE_ID_1}'`);
    });
});
