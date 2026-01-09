
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Mock child_process
jest.mock('child_process');
// Mock fs
jest.mock('fs');
// mock utils to avoid loading deep dependencies that cause issues in test environment
jest.mock('../src/utils', () => ({
    getTargetDatabase: jest.fn().mockResolvedValue('test_db')
}));

// mock quoteutils
jest.mock('pgsql-deparser/utils/quote-utils', () => ({
    QuoteUtils: {
        quoteIdentifier: (s: string) => `"${s}"`,
        quoteQualifiedIdentifier: (s: string, t: string) => `"${s}"."${t}"`,
        formatEString: (s: string) => `'${s}'`
    }
}));

// mock pg-cache to simulate db results for prune logic
const mockPoolQuery = jest.fn();
jest.mock('pg-cache', () => ({
    getPgPool: () => ({
        query: mockPoolQuery
    })
}));

import dumpCmd from '../src/commands/dump';

describe('dump command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should call pg_dump with correct arguments', async () => {
        const spawnMock = child_process.spawn as unknown as jest.Mock;
        spawnMock.mockImplementation(() => ({
            on: (event: string, cb: any) => {
                if (event === 'close') cb(0);
            },
            stdout: { pipe: jest.fn() },
            stderr: { pipe: jest.fn() },
        }));

        const fsMkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
        const fsWriteSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        const argv = {
            database: 'test_db',
            out: 'output.sql',
            cwd: '/tmp'
        };
        const prompter = {} as any;
        const options = {} as any;

        await dumpCmd(argv, prompter, options);

        expect(spawnMock).toHaveBeenCalledWith(
            'pg_dump',
            expect.arrayContaining([
                '--format=plain',
                '--no-owner',
                '--no-privileges',
                '--file',
                expect.stringContaining('output.sql'),
                'test_db'
            ]),
            expect.objectContaining({
                env: expect.anything()
            })
        );
    });

    it('should generate prune sql when database-id is provided', async () => {
        const spawnMock = child_process.spawn as unknown as jest.Mock;
        spawnMock.mockImplementation(() => ({
            on: (event: string, cb: any) => {
                if (event === 'close') cb(0);
            }
        }));

        jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
        const fsWriteSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
        jest.spyOn(console, 'log').mockImplementation(() => { });

        // mock db responses for resolveDatabaseId and buildPruneSql
        mockPoolQuery
            .mockResolvedValueOnce({ rows: [{ id: 'uuid-123', name: 'test_db_id' }] }) // resolveDatabaseId
            .mockResolvedValueOnce({ rows: [{ table_schema: 'public', table_name: 'test_table' }] }); // buildPruneSql

        const argv = {
            database: 'test_db',
            out: 'output_prune.sql',
            'database-id': 'uuid-123',
            cwd: '/tmp'
        };
        const prompter = {} as any;
        const options = {} as any;

        await dumpCmd(argv, prompter, options);

        // verify prune sql appended
        expect(fsWriteSpy).toHaveBeenCalledWith(
            expect.stringContaining('output_prune.sql'),
            expect.stringContaining('delete from "public"."test_table" where database_id <> \'uuid-123\''),
            expect.objectContaining({ flag: 'a' })
        );
    });
});
