import { mergeRoutingProfiles, PgpmRoutingProfile } from '../src';

describe('mergeRoutingProfiles', () => {
  const workspace: PgpmRoutingProfile = {
    extensions: { toSchema: 'extensions' },
    roles: { anonymous: 'anon', administrator: 'service_role' }
  };

  it('returns undefined when no input defines any key', () => {
    expect(mergeRoutingProfiles()).toBeUndefined();
    expect(mergeRoutingProfiles(undefined, undefined)).toBeUndefined();
    expect(mergeRoutingProfiles({}, {})).toBeUndefined();
  });

  it('workspace-only: passes the workspace profile through', () => {
    expect(mergeRoutingProfiles(workspace, undefined)).toEqual(workspace);
    expect(mergeRoutingProfiles(workspace, {})).toEqual(workspace);
  });

  it('proxy-only: passes the inner profile through', () => {
    const proxy: PgpmRoutingProfile = { schemas: { vault: 'vault_a' } };
    expect(mergeRoutingProfiles(undefined, proxy)).toEqual(proxy);
  });

  it('both: inner scope wins per key, other keys are inherited', () => {
    const proxy: PgpmRoutingProfile = {
      schemas: { vault: 'vault_a' },
      roles: { anonymous: 'anon_a' }
    };
    expect(mergeRoutingProfiles(workspace, proxy)).toEqual({
      schemas: { vault: 'vault_a' },
      extensions: { toSchema: 'extensions' },
      roles: { anonymous: 'anon_a' }
    });
  });

  it('overriding keys replace whole values (no deep merge)', () => {
    const outer: PgpmRoutingProfile = {
      extensions: { toSchema: 'ext', only: ['pgcrypto'] },
      route: [{ fromSchema: 'a', kind: 'table', name: 't', toSchema: 'b' }]
    };
    const inner: PgpmRoutingProfile = { extensions: { toSchema: null } };
    expect(mergeRoutingProfiles(outer, inner)).toEqual({
      extensions: { toSchema: null },
      route: [{ fromSchema: 'a', kind: 'table', name: 't', toSchema: 'b' }]
    });
  });

  it('merges left to right across more than two scopes', () => {
    const defaults: PgpmRoutingProfile = { roles: { anonymous: 'anonymous' } };
    const inner: PgpmRoutingProfile = { roles: { anonymous: 'anon_inner' } };
    expect(mergeRoutingProfiles(defaults, workspace, inner)).toEqual({
      extensions: { toSchema: 'extensions' },
      roles: { anonymous: 'anon_inner' }
    });
  });
});
