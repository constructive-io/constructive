import { type RoleGraph } from '../src/checks/lattice';
import {
  checkUntrustedForeignTableGrants,
  checkUntrustedSequenceGrants
} from '../src/checks/object-acls';
import type { RoleAttributes } from '../src/pg/acl';
import type { GrantInfo, PgPrivilege } from '../src/pg/introspect';
import type { ObjectAclSnapshot } from '../src/pg/objects';

function grant(role: string, privilege: PgPrivilege): GrantInfo {
  return { role, privilege, grantable: false, bypassRls: false };
}

function sequence(partial: Partial<ObjectAclSnapshot> = {}): ObjectAclSnapshot {
  return {
    schema: 'app',
    name: 'orders_id_seq',
    kind: 'sequence',
    owner: 'app_owner',
    grants: [grant('anon', 'USAGE')],
    ...partial
  };
}

function foreignTable(partial: Partial<ObjectAclSnapshot> = {}): ObjectAclSnapshot {
  return {
    schema: 'app',
    name: 'remote_orders',
    kind: 'foreign table',
    owner: 'app_owner',
    grants: [grant('anon', 'SELECT')],
    server: 'analytics',
    ...partial
  };
}

function role(name: string, partial: Partial<RoleAttributes> = {}): [string, RoleAttributes] {
  return [
    name,
    { name, bypassRls: false, isSuper: false, inheritsFrom: [], canSetRole: [], ...partial }
  ];
}

const GRAPH: RoleGraph = new Map([role('anon'), role('app_owner'), role('reader')]);
const ANON = { roles: ['anon'] };

describe('L16 — sequence privileges', () => {
  it('reports what USAGE actually confers, not just that a grant exists', () => {
    const [f] = checkUntrustedSequenceGrants([sequence()], GRAPH, ANON);
    expect(f.code).toBe('L16');
    expect(f.table).toBe('orders_id_seq');
    expect(f.message).toMatch(/nextval/);
    expect(f.context).toMatchObject({ objectKind: 'sequence', privileges: ['USAGE'] });
  });

  it('separates reading the counter from advancing it', () => {
    const [read] = checkUntrustedSequenceGrants(
      [sequence({ grants: [grant('anon', 'SELECT')] })],
      GRAPH,
      ANON
    );
    expect(read.message).toMatch(/last_value/);
    expect(read.message).not.toMatch(/nextval/);
  });

  it('follows PUBLIC, so a grant nobody named still reports', () => {
    const [f] = checkUntrustedSequenceGrants(
      [sequence({ grants: [grant('PUBLIC', 'USAGE')] })],
      GRAPH,
      ANON
    );
    expect(f?.code).toBe('L16');
    expect(f.context).toMatchObject({ via: 'PUBLIC' });
  });

  it('follows role inheritance the same way the rest of the lattice does', () => {
    const graph: RoleGraph = new Map([role('anon', { inheritsFrom: ['reader'] }), role('reader')]);
    const [f] = checkUntrustedSequenceGrants(
      [sequence({ grants: [grant('reader', 'USAGE')] })],
      graph,
      ANON
    );
    expect(f.context).toMatchObject({ via: 'member of reader' });
  });

  it('leads with identity columns, not a revoke, when the sequence feeds a column', () => {
    const [f] = checkUntrustedSequenceGrants(
      [sequence({ ownedBy: 'app.orders.id' })],
      GRAPH,
      ANON
    );
    expect(f.message).toMatch(/feeds app\.orders\.id/);
    expect(f.hint).toMatch(/AS IDENTITY/);
    expect(f.hint).toMatch(/needs USAGE, and revoking it/);
    expect(f.context).toMatchObject({ ownedBy: 'app.orders.id' });
  });

  it('stays silent on a sequence the role cannot touch', () => {
    expect(
      checkUntrustedSequenceGrants([sequence({ grants: [] })], GRAPH, ANON)
    ).toEqual([]);
  });

  it('does nothing without a configured role list', () => {
    expect(checkUntrustedSequenceGrants([sequence()], GRAPH)).toEqual([]);
  });
});

describe('L17 — foreign-table grants', () => {
  it('reports the grant and names the server behind it', () => {
    const [f] = checkUntrustedForeignTableGrants([foreignTable()], GRAPH, ANON);
    expect(f.code).toBe('L17');
    expect(f.message).toMatch(/server analytics/);
    expect(f.context).toMatchObject({ objectKind: 'foreign table', privileges: ['SELECT'] });
  });

  it('says the A2 remedy is unavailable here, because Postgres refuses RLS on one', () => {
    const [f] = checkUntrustedForeignTableGrants([foreignTable()], GRAPH, ANON);
    expect(f.message).toMatch(/cannot carry RLS/);
    expect(f.hint).toMatch(/rejects `ENABLE ROW LEVEL SECURITY`/);
  });

  it('does not grade a sequence, and the sequence rule does not grade it', () => {
    expect(checkUntrustedForeignTableGrants([sequence()], GRAPH, ANON)).toEqual([]);
    expect(checkUntrustedSequenceGrants([foreignTable()], GRAPH, ANON)).toEqual([]);
  });

  it('stays silent when the untrusted role holds nothing on it', () => {
    expect(
      checkUntrustedForeignTableGrants([foreignTable({ grants: [] })], GRAPH, ANON)
    ).toEqual([]);
  });
});
