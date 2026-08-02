import { getConnections, PgTestClient } from 'pgsql-test';

import { introspectRoleGraph } from '../src/pg/acl';

jest.setTimeout(120000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
  await pg.any(`
    DO $$ BEGIN CREATE ROLE fx_sr_target NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE ROLE fx_sr_inh_target NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE ROLE fx_sr_member NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    -- SET ROLE only: can assume the target, inherits none of its privileges.
    GRANT fx_sr_target TO fx_sr_member WITH INHERIT FALSE, SET TRUE;
    -- Inheritance only: passively holds the target's privileges, cannot SET ROLE.
    GRANT fx_sr_inh_target TO fx_sr_member WITH INHERIT TRUE, SET FALSE;
  `);
});

afterAll(async () => {
  if (teardown) await teardown();
});

describe('introspectRoleGraph — set_option (SET ROLE) closure', () => {
  it('records a SET-ROLE-only membership in canSetRole, not inheritsFrom', async () => {
    const graph = await introspectRoleGraph(pg.client as never);
    const member = graph.get('fx_sr_member');
    expect(member).toBeDefined();
    expect(member!.canSetRole).toContain('fx_sr_target');
    expect(member!.inheritsFrom).not.toContain('fx_sr_target');
  });

  it('records an INHERIT-only membership in inheritsFrom, not canSetRole', async () => {
    const graph = await introspectRoleGraph(pg.client as never);
    const member = graph.get('fx_sr_member');
    expect(member!.inheritsFrom).toContain('fx_sr_inh_target');
    expect(member!.canSetRole).not.toContain('fx_sr_inh_target');
  });
});
