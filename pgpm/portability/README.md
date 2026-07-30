# @pgpmjs/portability

Vendor portability for pgpm: move packages between vendor-managed PostgreSQL
environments (Supabase, InsForge, ...) and plain PostgreSQL/pgpm — and test the
result with `pgsql-test`.

## Seed adapter

Deploy a workspace target (typically an apply proxy carrying `pgpm.apply.json`)
into a test database, through the same engine path as `pgpm deploy`:

```ts
import { getConnections } from 'pgsql-test';
import { seed } from '@pgpmjs/portability';

const { pg, teardown } = await getConnections({}, [
  seed.apply('vendor-app-ported')
]);
```

The workspace is discovered from the test's cwd; dependencies resolve from the
workspace module map; proxy modules transpile and materialize through the
apply path.

## Vendor shapes

A `VendorShape` describes a vendor's managed subsystems (auth schemas, roles,
extensions schema, users table, accessor functions). Build routing profiles in
either direction from a shape plus a provider binding:

```ts
import { fromVendorProfile, supabase, toVendorProfile } from '@pgpmjs/portability';

const provider = {
  schema: 'app_auth',
  users: 'users',
  accessors: { uid: 'current_user_id' },
  roles: { authenticated: 'app_authenticated' }
};

// vendor → pgpm: exclude the vendor auth subsystem, rebind onto the provider,
// de-qualify extension symbols, translate roles
const off = fromVendorProfile(supabase, provider);

// pgpm → vendor: the inverse — rebind onto the native subsystem, qualify
// extension symbols, translate roles back
const on = toVendorProfile(supabase, provider);
```

The resulting `PgpmRoutingProfile` drops into a workspace `portability` block
or a proxy module's `pgpm.apply.json`.
