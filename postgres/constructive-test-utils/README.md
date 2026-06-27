# @constructive-io/test-utils

Dynamic metaschema-aware test utilities for Constructive apps.

Built on top of `pgsql-test`, this package provides:

- **Module Resolution** — dynamically resolve storage, events, billing, limits, agent, and other module tables from `metaschema_modules_public.*`
- **Membership Management** — set up app/org/entity memberships at both global and database-local levels, triggering SPRT population via the standard trigger chain
- **Context Helpers** — `setUserContext()`, `asUser()`, `asAdmin()` for clean JWT context switching
- **TableClient** — generic CRUD wrapper for dynamically-resolved tables
- **RLS Assertions** — `expectRlsDenied()`, `expectRlsHidden()`, `expectRlsAllowed()` for testing row-level security
- **SPRT Introspection** — read-only helpers for asserting trigger chain correctness (never writes to SPRT)
- **Provisioning** — `provisionDatabase()`, `constructBlueprint()`, `MODULE_PRESETS`
- **Catalog Introspection** — `schemaExists()`, `tableExists()`, `columnExists()`, `rlsPolicyExists()`

## Install

```bash
pnpm add @constructive-io/test-utils pgsql-test
```

## Usage

```typescript
import { getConnections } from 'pgsql-test';
import {
  provisionDatabase,
  MODULE_PRESETS,
  setDatabaseAppMembershipDefaults,
  seedDatabaseUser,
  makeDatabaseAppAdmin,
  setUserContext,
  resolveStorageModule,
  TableClient,
  expectRlsDenied,
  TEST_USER_IDS,
} from '@constructive-io/test-utils';

const ALICE_ID = TEST_USER_IDS.ALICE;

let pg, db, teardown, database_id;

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());

  database_id = await provisionDatabase(pg, {
    owner_id: ALICE_ID,
    modules: MODULE_PRESETS.WITH_STORAGE,
  });

  await setDatabaseAppMembershipDefaults(pg, database_id, {
    is_verified: true,
    is_approved: true,
  });

  await seedDatabaseUser(pg, database_id, {
    user_id: ALICE_ID,
    username: 'alice',
  });

  await makeDatabaseAppAdmin(pg, database_id, ALICE_ID);
});

afterAll(() => teardown());
beforeEach(() => { pg.beforeEach(); db.beforeEach(); });
afterEach(() => { db.afterEach(); pg.afterEach(); });

it('resolves storage tables dynamically', async () => {
  const storage = await resolveStorageModule(pg, database_id);
  const buckets = new TableClient(db, storage.buckets.schema_name, 'buckets');

  setUserContext(db, ALICE_ID, database_id);
  const bucket = await buckets.insert({ name: 'photos', bucket_key: 'photos' });
  expect(bucket.name).toBe('photos');
});
```
