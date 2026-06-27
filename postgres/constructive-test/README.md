# constructive-test

Extends `pgsql-test` with Constructive platform defaults.

## Features

- Auto-derives `jwt.claims.principal_id` from `jwt.claims.user_id` on every `setContext()` call
- Bakes in Constructive role mappings (`anonymous`, `authenticated`, `administrator`)
- Drop-in replacement for `pgsql-test` — re-exports everything

## Usage

```typescript
import { getConnections } from 'constructive-test';

let db, teardown;
beforeAll(async () => {
  ({ db, teardown } = await getConnections());
});
afterAll(() => teardown());
beforeEach(() => db.beforeEach());
afterEach(() => db.afterEach());

test('principal_id is auto-set', async () => {
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': '123',
    'jwt.claims.database_id': 'abc'
    // principal_id is automatically set to '123'
  });
  const result = await db.one('SELECT current_setting(\'jwt.claims.principal_id\')');
  expect(result.current_setting).toBe('123');
});
```
