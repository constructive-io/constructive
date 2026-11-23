import { classifyAgainstLedger } from '@pgpmjs/diff';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { parse } from 'pgsql-parser';

import { planChangeRefs } from '../../src/diff/ledger';
import { loadPlanSideModules } from '../../src/diff/sides';
import { hashSqlFile, hashString } from '../../src/migrate/utils/hash';
import { cleanTree } from '../../src/packaging/package';

describe('ledger classification of pre-upgrade AST hashes', () => {
  let dir: string;
  let deployPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pgpm-ledger-legacy-'));
    writeFileSync(
      join(dir, 'pgpm.plan'),
      [
        '%syntax-version=1.0.0',
        '%project=my-mod',
        '%uri=my-mod',
        '',
        'schema 2017-08-11T08:11:51Z t <t@x> # schema',
        ''
      ].join('\n')
    );
    mkdirSync(join(dir, 'deploy'), { recursive: true });
    deployPath = join(dir, 'deploy', 'schema.sql');
    writeFileSync(deployPath, '-- Deploy: schema to pg\nCREATE SCHEMA app;\n');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // What hashSqlFile returned before it dropped the parser version.
  const preUpgradeAstHash = async (version: number): Promise<string> => {
    const parsed = await parse(readFileSync(deployPath, 'utf-8'));
    return hashString(JSON.stringify(cleanTree({ ...parsed, version })));
  };

  const classify = async (scriptHash: string) => {
    const refs = await planChangeRefs(await loadPlanSideModules(dir));
    const ledger = [{ package: 'my-mod', changeName: 'schema', scriptHash }];
    return classifyAgainstLedger(refs, ledger).entries[0].status;
  };

  it.each([180004, 180006])(
    'classifies a row recorded with the parser %i AST hash as deployed',
    async version => {
      const legacy = await preUpgradeAstHash(version);
      expect(legacy).not.toBe(await hashSqlFile(deployPath));
      expect(await classify(legacy)).toBe('deployed-identical');
    }
  );

  it('still classifies the current AST hash as deployed', async () => {
    expect(await classify(await hashSqlFile(deployPath))).toBe('deployed-identical');
  });

  it('still reports a row with a foreign hash as drifted', async () => {
    writeFileSync(deployPath, '-- Deploy: schema to pg\nCREATE SCHEMA other;\n');
    const stale = await preUpgradeAstHash(180004);
    writeFileSync(deployPath, '-- Deploy: schema to pg\nCREATE SCHEMA app;\n');
    expect(await classify(stale)).toBe('deployed-drifted');
  });
});
