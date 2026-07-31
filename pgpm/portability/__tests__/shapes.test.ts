import { fromVendorProfile, insforge, ProviderBinding, supabase, toVendorProfile } from '../src';

const provider: ProviderBinding = {
  schema: 'app_auth',
  users: 'users',
  accessors: { uid: 'current_user_id' },
  roles: { authenticated: 'app_authenticated' }
};

describe('fromVendorProfile (vendor → pgpm)', () => {
  const profile = fromVendorProfile(supabase, provider);

  it('excludes the vendor auth subsystem', () => {
    expect(profile.exclude).toEqual({ schemas: ['auth'] });
  });

  it('rebinds the users table and accessors onto the provider', () => {
    expect(profile.route).toEqual([
      { fromSchema: 'auth', kind: 'table', name: 'users', toSchema: 'app_auth' },
      {
        fromSchema: 'auth',
        kind: 'function',
        name: 'uid',
        toSchema: 'app_auth',
        toName: 'current_user_id'
      }
    ]);
  });

  it('de-qualifies vendor extension symbols', () => {
    expect(profile.extensions).toEqual({ toSchema: null, from: ['extensions'] });
  });

  it('translates roles', () => {
    expect(profile.roles).toEqual({ authenticated: 'app_authenticated' });
  });

  it('omits keys the shape does not need', () => {
    const p = fromVendorProfile(insforge, { schema: 'app_auth', users: 'users' });
    expect(p.extensions).toBeUndefined();
    expect(p.roles).toBeUndefined();
    expect(p.route).toEqual([
      { fromSchema: 'auth', kind: 'table', name: 'users', toSchema: 'app_auth' }
    ]);
  });
});

describe('toVendorProfile (pgpm → vendor)', () => {
  const profile = toVendorProfile(supabase, provider);

  it('does not exclude anything — the vendor subsystem is native there', () => {
    expect(profile.exclude).toBeUndefined();
  });

  it('rebinds provider objects back onto the vendor subsystem', () => {
    expect(profile.route).toEqual([
      { fromSchema: 'app_auth', kind: 'table', name: 'users', toSchema: 'auth' },
      {
        fromSchema: 'app_auth',
        kind: 'function',
        name: 'current_user_id',
        toSchema: 'auth',
        toName: 'uid'
      }
    ]);
  });

  it('qualifies extension symbols into the vendor extensions schema', () => {
    expect(profile.extensions).toEqual({ toSchema: 'extensions', from: [null] });
  });

  it('translates roles back to vendor names', () => {
    expect(profile.roles).toEqual({ app_authenticated: 'authenticated' });
  });

  it('refuses an unqualified provider — nothing to route from', () => {
    expect(() => toVendorProfile(supabase, { schema: null, users: 'users' })).toThrow(
      /named schema/
    );
  });
});

describe('insforge shape (second vendor — no extensions schema)', () => {
  const provider: ProviderBinding = {
    schema: 'app_auth',
    users: 'users',
    accessors: { uid: 'current_user_id' },
    roles: { authenticated: 'app_authenticated' }
  };

  it('excludes auth, rebinds the users table and the uid accessor, translates roles', () => {
    const profile = fromVendorProfile(insforge, provider);
    expect(profile.exclude).toEqual({ schemas: ['auth'] });
    expect(profile.route).toEqual([
      { fromSchema: 'auth', kind: 'table', name: 'users', toSchema: 'app_auth' },
      {
        fromSchema: 'auth',
        kind: 'function',
        name: 'uid',
        toSchema: 'app_auth',
        toName: 'current_user_id'
      }
    ]);
    expect(profile.roles).toEqual({ authenticated: 'app_authenticated' });
  });

  it('emits no extensions transform — InsForge has no extensions schema', () => {
    expect(fromVendorProfile(insforge, provider).extensions).toBeUndefined();
    expect(toVendorProfile(insforge, provider).extensions).toBeUndefined();
  });

  it('round-trips onto the native subsystem in reverse', () => {
    const profile = toVendorProfile(insforge, provider);
    expect(profile.route).toEqual([
      { fromSchema: 'app_auth', kind: 'table', name: 'users', toSchema: 'auth' },
      {
        fromSchema: 'app_auth',
        kind: 'function',
        name: 'current_user_id',
        toSchema: 'auth',
        toName: 'uid'
      }
    ]);
    expect(profile.roles).toEqual({ app_authenticated: 'authenticated' });
  });
});
