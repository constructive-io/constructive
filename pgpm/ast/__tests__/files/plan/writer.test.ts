import fs from 'fs';
import os from 'os';
import path from 'path';
import { writePgpmPlan } from '../../../src/files/plan/writer';
import { PgpmRow } from '../../../src/files/types';

describe('writePgpmPlan', () => {
  let tempDir: string;
  let outputDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pgpm-writer-test-'));
    outputDir = path.join(tempDir, 'output');
    fs.mkdirSync(outputDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const createTestRows = (): PgpmRow[] => [
    {
      deploy: 'schemas/test/schema',
      revert: 'schemas/test/schema',
      verify: 'schemas/test/schema',
      content: 'CREATE SCHEMA test;',
      name: 'create_schema',
      deps: []
    },
    {
      deploy: 'schemas/test/tables/users/table',
      revert: 'schemas/test/tables/users/table',
      verify: 'schemas/test/tables/users/table',
      content: 'CREATE TABLE test.users (id uuid);',
      name: 'create_table',
      deps: ['schemas/test/schema']
    }
  ];

  it('should write plan file with simple author name', () => {
    const rows = createTestRows();
    const opts = {
      outdir: outputDir,
      name: 'test-module',
      author: 'John Doe',
      replacer: (str: string) => str.replace('constructive-extension-name', 'test-module')
    };

    writePgpmPlan(rows, opts);

    const planPath = path.join(outputDir, 'test-module', 'pgpm.plan');
    expect(fs.existsSync(planPath)).toBe(true);

    const content = fs.readFileSync(planPath, 'utf-8');
    expect(content).toContain('%project=test-module');
    expect(content).toContain('John Doe <John Doe@5b0c196eeb62>');
    expect(content).toContain('schemas/test/schema 2017-08-11T08:11:51Z John Doe <John Doe@5b0c196eeb62>');
    expect(content).toContain('schemas/test/tables/users/table [schemas/test/schema] 2017-08-11T08:11:51Z John Doe <John Doe@5b0c196eeb62>');
  });

  it('should parse author with email format correctly', () => {
    const rows = createTestRows();
    const opts = {
      outdir: outputDir,
      name: 'test-module',
      author: 'Alex Thompson <alex.thompson@example.com>',
      replacer: (str: string) => str.replace('constructive-extension-name', 'test-module')
    };

    writePgpmPlan(rows, opts);

    const planPath = path.join(outputDir, 'test-module', 'pgpm.plan');
    const content = fs.readFileSync(planPath, 'utf-8');

    // Should have only ONE email part, not two
    expect(content).toContain('Alex Thompson <alex.thompson@example.com>');
    expect(content).not.toContain('Alex Thompson <alex.thompson@example.com> <');
    expect(content).not.toContain('@5b0c196eeb62');
    
    // Verify the format is correct
    expect(content).toMatch(/schemas\/test\/schema 2017-08-11T08:11:51Z Alex Thompson <alex.thompson@example.com> # add create_schema/);
  });

  it('should handle author with email and extra spaces', () => {
    const rows = createTestRows();
    const opts = {
      outdir: outputDir,
      name: 'test-module',
      author: '  Jane Smith  <jane@example.com>  ',
      replacer: (str: string) => str.replace('constructive-extension-name', 'test-module')
    };

    writePgpmPlan(rows, opts);

    const planPath = path.join(outputDir, 'test-module', 'pgpm.plan');
    const content = fs.readFileSync(planPath, 'utf-8');

    // Should trim spaces correctly
    expect(content).toContain('Jane Smith <jane@example.com>');
    expect(content).not.toContain('  Jane Smith  <jane@example.com>  ');
  });

  it('should use default author when not provided', () => {
    const rows = createTestRows();
    const opts = {
      outdir: outputDir,
      name: 'test-module',
      replacer: (str: string) => str.replace('constructive-extension-name', 'test-module')
    };

    writePgpmPlan(rows, opts);

    const planPath = path.join(outputDir, 'test-module', 'pgpm.plan');
    const content = fs.readFileSync(planPath, 'utf-8');

    expect(content).toContain('constructive <constructive@5b0c196eeb62>');
  });

  it('should handle rows with dependencies correctly', () => {
    const rows: PgpmRow[] = [
      {
        deploy: 'schemas/test/schema',
        content: 'CREATE SCHEMA test;',
        name: 'create_schema',
        deps: []
      },
      {
        deploy: 'schemas/test/tables/users/table',
        content: 'CREATE TABLE test.users (id uuid);',
        name: 'create_table',
        deps: ['schemas/test/schema', 'schemas/test/tables/roles/table']
      }
    ];

    const opts = {
      outdir: outputDir,
      name: 'test-module',
      author: 'Test User <test@example.com>',
      replacer: (str: string) => str.replace('constructive-extension-name', 'test-module')
    };

    writePgpmPlan(rows, opts);

    const planPath = path.join(outputDir, 'test-module', 'pgpm.plan');
    const content = fs.readFileSync(planPath, 'utf-8');

    // First row should not have dependencies bracket
    expect(content).toMatch(/^schemas\/test\/schema 2017-08-11T08:11:51Z Test User <test@example.com>/m);
    
    // Second row should have dependencies bracket
    expect(content).toMatch(/schemas\/test\/tables\/users\/table \[schemas\/test\/schema schemas\/test\/tables\/roles\/table\] 2017-08-11T08:11:51Z Test User <test@example.com>/);
  });

  it('should skip duplicate deploy paths', () => {
    const rows: PgpmRow[] = [
      {
        deploy: 'schemas/test/schema',
        content: 'CREATE SCHEMA test;',
        name: 'create_schema',
        deps: []
      },
      {
        deploy: 'schemas/test/schema', // duplicate
        content: 'ALTER SCHEMA test;',
        name: 'alter_schema',
        deps: []
      }
    ];

    const opts = {
      outdir: outputDir,
      name: 'test-module',
      author: 'Test User',
      replacer: (str: string) => str.replace('constructive-extension-name', 'test-module')
    };

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    writePgpmPlan(rows, opts);

    const planPath = path.join(outputDir, 'test-module', 'pgpm.plan');
    const content = fs.readFileSync(planPath, 'utf-8');

    // Should only appear once
    const matches = content.match(/schemas\/test\/schema/g);
    expect(matches?.length).toBe(1); // Only in the header line, not duplicated

    expect(consoleSpy).toHaveBeenCalledWith('DUPLICATE schemas/test/schema');
    
    consoleSpy.mockRestore();
  });

  it('should apply replacer function to plan content', () => {
    const rows = createTestRows();
    const opts = {
      outdir: outputDir,
      name: 'test-module',
      author: 'Test User',
      replacer: (str: string) => {
        return str
          .replace(/constructive-extension-name/g, 'test-module')
          .replace(/schemas\/test/g, 'schemas/custom');
      }
    };

    writePgpmPlan(rows, opts);

    const planPath = path.join(outputDir, 'test-module', 'pgpm.plan');
    const content = fs.readFileSync(planPath, 'utf-8');

    expect(content).toContain('%project=test-module');
    expect(content).toContain('%uri=test-module');
    expect(content).toContain('schemas/custom/schema');
    expect(content).toContain('schemas/custom/tables/users/table');
    expect(content).not.toContain('constructive-extension-name');
  });
});

