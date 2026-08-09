# @constructive-io/express-context

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/express-context"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=packages%2Fexpress-context%2Fpackage.json"/></a>
</p>

Extractable Express middleware for Constructive tenant context — domain resolution, JWT auth, pgSettings, withPgClient, and modular per-database cached lookups.

## Usage

```typescript
import {
  createContextMiddleware,
  requestIdMiddleware,
  createDefaultRegistry,
} from '@constructive-io/express-context';

const loaders = createDefaultRegistry();

const app = express();

app.use(requestIdMiddleware());
app.use(apiMiddleware);            // sets req.api
app.use(authMiddleware);           // sets req.token
app.use(createContextMiddleware({ loaders })); // builds req.constructive

app.post('/v1/chat', async (req, res) => {
  const ctx = req.constructive;
  const rls = await ctx.useModule('rlsModule');       // only fires if not cached
  const auth = await ctx.useModule('authSettings');    // only fires if not cached
  // webauthnSettings loader never fires if nobody asks for it

  const result = await ctx.withPgClient(async (client) => {
    return client.query('SELECT current_user_id()');
  });

  res.json(result.rows);
});
```

## What it provides

- **Types** — `ApiStructure`, `RlsModule`, `AuthSettings`, `ConstructiveContext`, etc.
- **pgSettings builder** — Constructs SET LOCAL key-value pairs from API + token
- **withPgClient** — Tenant-scoped RLS transaction helper (BEGIN → SET LOCAL → fn → COMMIT)
- **requestId middleware** — UUID correlation ID (from X-Request-Id header or generated)
- **Context middleware** — Composes all of the above into `req.constructive`
- **Module loaders** — Pluggable per-database cached lookups with lazy on-demand resolution

## Module Loaders

Each loader encapsulates a SQL query + type transform + per-databaseId LRU cache for one piece of per-database configuration. Loaders are registered in a `LoaderRegistry` and resolved lazily via `useModule(name)`.

### Built-in loaders

| Loader | Source | Description |
|--------|--------|-------------|
| `rlsLoader` | `routing_public.rls_settings` | RLS module (authenticate functions, schema refs) |
| `corsLoader` | `routing_public.cors_settings` | CORS allowed origins |
| `databaseSettingsLoader` | `routing_public.database_settings` | Feature flags (aggregates, search, uploads, etc.) |
| `pubkeyLoader` | `routing_public.pubkey_settings` | Public key challenge auth settings |
| `webauthnLoader` | `routing_public.webauthn_settings` | WebAuthn/passkey configuration |
| `authSettingsLoader` | `metaschema_modules_public.sessions_module` | Cookie/captcha settings (two-step tenant DB discovery) |

### Opt-in authentication loaders

`identityProvidersLoader` resolves enabled Tenant Provider configuration and
secrets. `ssoSurfaceLoader` resolves only the current database's provisioned
unified-auth private schema. Both are intentionally excluded from
`createDefaultRegistry()` and must be registered by the authentication service
that owns their cost and secret boundary:

```typescript
const registry = createDefaultRegistry();
registry.register(identityProvidersLoader);
registry.register(ssoSurfaceLoader);
```

`ssoSurfaceLoader` returns `undefined` when the current Tenant has no provisioned
unified-auth module. It never guesses a global `sso_private` schema or searches
another database.

### Custom loaders

```typescript
import { createModuleLoader, createLoaderRegistry } from '@constructive-io/express-context';

const myLoader = createModuleLoader({
  name: 'myModule',
  ttlMs: 60_000,
  async resolve(ctx) {
    const { rows } = await ctx.tenantPool.query(MY_SQL, [ctx.databaseId]);
    return rows[0] ? transform(rows[0]) : undefined;
  },
});

const registry = createLoaderRegistry();
registry.register(myLoader);
```
