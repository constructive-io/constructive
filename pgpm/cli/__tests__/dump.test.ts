
import * as fs from 'fs';

// Mock fs
jest.mock('fs');
// mock utils to avoid loading deep dependencies that cause issues in test environment
jest.mock('../src/utils', () => ({
  getTargetDatabase: jest.fn().mockResolvedValue('test_db')
}));

// mock the core pg_dump helper (the command's only dump seam)
const mockPgDump = jest.fn().mockResolvedValue('');
jest.mock('@pgpmjs/core', () => ({
  pgDump: (...args: unknown[]) => mockPgDump(...args)
}));

// mock quoteutils
jest.mock('@pgsql/quotes', () => ({
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
    mockPgDump.mockResolvedValue('');
  });

  it('should call pg_dump with correct options', async () => {
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => { });

    const argv = {
      database: 'test_db',
      out: 'output.sql',
      cwd: '/tmp'
    };
    const prompter = {} as any;
    const options = {} as any;

    await dumpCmd(argv, prompter, options);

    expect(mockPgDump).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ database: 'test_db' }),
        format: 'plain',
        noOwner: true,
        noPrivileges: true,
        file: expect.stringContaining('output.sql')
      })
    );
  });

  it('should generate prune sql when database-id is provided', async () => {
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
