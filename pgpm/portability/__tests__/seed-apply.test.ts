import { cpSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { getConnections, PgTestClient, SeedAdapter } from 'pgsql-test';

import { seed } from '../src';

// seed.apply must plug into pgsql-test's adapter slot as-is.
const _typecheck: SeedAdapter = seed.apply('anything');

const fixture = resolve(__dirname, '../../../__fixtures__/apply/proxy');

let pg: PgTestClient;
let teardown: () => Promise<void>;
let workspace: string;

beforeAll(async () => {
  workspace = mkdtempSync(join(tmpdir(), 'pgpm-portability-'));
  cpSync(fixture, workspace, { recursive: true });

  ({ pg, teardown } = await getConnections({}, [
    seed.apply('tenant-a', { cwd: workspace })
  ]));
});

afterAll(async () => {
  await teardown();
  rmSync(workspace, { recursive: true, force: true });
});

beforeEach(() => pg.beforeEach());
afterEach(() => pg.afterEach());

it('deploys the apply proxy through the engine path into the routed schema', async () => {
  const { rows } = await pg.query(
    `SELECT table_schema FROM information_schema.tables WHERE table_name = 'accounts'`
  );
  expect(rows.map(r => r.table_schema)).toEqual(['tenant_a']);
});

it('records the instance on the migration ledger', async () => {
  const { rows } = await pg.query(
    `SELECT DISTINCT package FROM pgpm_migrate.changes WHERE package = 'tenant-a'`
  );
  expect(rows).toHaveLength(1);
});
