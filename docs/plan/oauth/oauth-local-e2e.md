# OAuth Local E2E Test Steps

This is the short local runbook for validating the OAuth runtime on `feat/oauth-reorg`.

Do not commit real OAuth client secrets, `OAUTH_STATE_SECRET`, non-local database passwords, or reusable tokens. Export provider credentials from a local secret source.

## 1. Use the Target Branch

```bash
cd /Users/zeta/Projects/interweb/src/agents/constructive
git fetch origin
git checkout feat/oauth-reorg
git pull --ff-only
git status --short --branch
```

## 2. Prepare Local Secrets

Prepare two groups of environment variables:

- GraphQL server runtime: `OAUTH_STATE_SECRET`. The server reads this at startup to sign and verify `oauth_state` / `oauth_pkce` cookies.
- Provider initialization SQL: `GITHUB_OAUTH_*` and `GOOGLE_OAUTH_*`. These are passed into the provider setup `psql` scripts below, then written or rotated into the database. The GraphQL server does not read these provider credential env vars directly.

```bash
# GraphQL server runtime.
export OAUTH_STATE_SECRET="$(openssl rand -hex 32)"

# Provider initialization scripts only.
export GITHUB_OAUTH_CLIENT_ID="<github-client-id>"
export GITHUB_OAUTH_CLIENT_SECRET="<github-client-secret>"

export GOOGLE_OAUTH_CLIENT_ID="<google-client-id>"
export GOOGLE_OAUTH_CLIENT_SECRET="<google-client-secret>"
```

Provider callback URLs:

```text
GitHub: http://auth.localhost:3000/auth/github/callback
Google: http://localhost:3000/auth/google/callback
```

Google is tested through bare `localhost` because Google may reject `auth.localhost` as a local redirect URI.

## 3. Rebuild the Local Database

```bash
cd /Users/zeta/Projects/interweb/src/agents/constructive-db

pgpm docker start --image docker.io/constructiveio/postgres-plus:18 --recreate
eval "$(pgpm env)"

pgpm admin-users bootstrap --yes
pgpm admin-users add --test --yes

dropdb --if-exists constructive
createdb constructive

pgpm deploy --yes --database constructive --package constructive-local
```

## 4. Apply Local OAuth Test Setup

`PGPASSWORD` in the setup commands is only the local PostgreSQL connection password for `psql`.

```bash
PGPASSWORD=password psql -h localhost -U postgres -d constructive -v ON_ERROR_STOP=1 <<'SQL'
-- Local HTTP cookies.
UPDATE constructive_auth_private.app_settings_auth
SET allow_identity_sign_in = true,
    allow_identity_sign_up = true,
    oauth_require_verified_email = false,
    cookie_secure = false;

-- rotate_identity_provider_platform_secret currently expects this namespace.
INSERT INTO constructive_infra_public.platform_namespaces (database_id, name, status)
SELECT database_id, 'default', 'ready'
FROM services_public.apis
WHERE name = 'auth'
LIMIT 1
ON CONFLICT (database_id, name) DO NOTHING;

-- Google local callback alias: localhost -> auth API.
DELETE FROM services_public.domains
WHERE domain = 'localhost'
  AND subdomain IS NULL;

INSERT INTO services_public.domains (database_id, api_id, domain, subdomain, annotations)
SELECT database_id, id, 'localhost', NULL,
       jsonb_build_object('purpose', 'local-google-oauth-callback')
FROM services_public.apis
WHERE name = 'auth'
LIMIT 1;
SQL
```

## 5. Build and Start the Server

```bash
cd /Users/zeta/Projects/interweb/src/agents/constructive
pnpm install
pnpm build
```

```bash
# GraphQL server runtime environment.
PGHOST=localhost \
PGPORT=5432 \
PGUSER=postgres \
PGPASSWORD=password \
PGDATABASE=constructive \
NODE_USE_ENV_PROXY=1 \
NO_PROXY="localhost,127.0.0.1,::1,.localhost" \
OAUTH_STATE_SECRET="$OAUTH_STATE_SECRET" \
pnpm --filter @constructive-io/graphql-server dev
```

Expected:

```text
listening at http://localhost:3000
```

`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE` are the GraphQL server's database connection settings for this local run. `OAUTH_STATE_SECRET` is the OAuth state-cookie signing secret. `NODE_USE_ENV_PROXY` and `NO_PROXY` control Node's outbound HTTP behavior.

Keep `NODE_USE_ENV_PROXY=1` when the local network needs `HTTP_PROXY` / `HTTPS_PROXY`. Without it, Node's native `fetch` can fail during OAuth token exchange with `CALLBACK_FAILED` and `TypeError: fetch failed`.

## 6. Configure Providers

These commands use the provider initialization env vars from step 2. `psql` substitutes them into the setup script, and `rotate_identity_provider_platform_secret(...)` stores the provider client secret in the database. The GraphQL server later reads provider credentials through loaders and database metadata, not from `GITHUB_OAUTH_*` or `GOOGLE_OAUTH_*`.

GitHub:

```bash
PGPASSWORD=password psql -h localhost -U postgres -d constructive \
  -v ON_ERROR_STOP=1 \
  -v github_client_id="$GITHUB_OAUTH_CLIENT_ID" \
  -v github_client_secret="$GITHUB_OAUTH_CLIENT_SECRET" <<'SQL'
UPDATE constructive_auth_private.identity_providers
SET enabled = true,
    client_id = :'github_client_id',
    authorization_url = 'https://github.com/login/oauth/authorize',
    token_url = 'https://github.com/login/oauth/access_token',
    userinfo_url = 'https://api.github.com/user',
    scopes = ARRAY['read:user', 'user:email'],
    pkce_enabled = true
WHERE slug = 'github';

SELECT constructive_auth_private.rotate_identity_provider_platform_secret(
  (SELECT id FROM constructive_auth_private.identity_providers WHERE slug = 'github'),
  :'github_client_secret'
);
SQL
```

Google:

```bash
PGPASSWORD=password psql -h localhost -U postgres -d constructive \
  -v ON_ERROR_STOP=1 \
  -v google_client_id="$GOOGLE_OAUTH_CLIENT_ID" \
  -v google_client_secret="$GOOGLE_OAUTH_CLIENT_SECRET" <<'SQL'
UPDATE constructive_auth_private.identity_providers
SET enabled = true,
    client_id = :'google_client_id',
    authorization_url = 'https://accounts.google.com/o/oauth2/v2/auth',
    token_url = 'https://oauth2.googleapis.com/token',
    userinfo_url = 'https://openidconnect.googleapis.com/v1/userinfo',
    scopes = ARRAY['openid', 'email', 'profile'],
    pkce_enabled = true
WHERE slug = 'google';

SELECT constructive_auth_private.rotate_identity_provider_platform_secret(
  (SELECT id FROM constructive_auth_private.identity_providers WHERE slug = 'google'),
  :'google_client_secret'
);
SQL
```

Verify without printing secrets:

```bash
PGPASSWORD=password psql -h localhost -U postgres -d constructive -v ON_ERROR_STOP=1 <<'SQL'
SELECT slug,
       enabled,
       client_id IS NOT NULL AND client_id <> '' AS has_client_id,
       client_secret_id IS NOT NULL AS has_client_secret,
       scopes,
       pkce_enabled
FROM constructive_auth_private.identity_providers
WHERE slug IN ('github', 'google')
ORDER BY slug;
SQL
```

## 7. Smoke Test

```bash
curl --noproxy '*' http://auth.localhost:3000/auth/providers
curl --noproxy '*' http://localhost:3000/auth/providers
```

Expected:

```json
{"providers":["github","google"]}
```

Authorization redirects:

```bash
curl --noproxy '*' -i 'http://auth.localhost:3000/auth/github?redirect_uri=/auth/providers'
curl --noproxy '*' -i 'http://localhost:3000/auth/google?redirect_uri=/auth/providers'
```

Expected:

- GitHub redirects to `https://github.com/login/oauth/authorize`.
- Google redirects to `https://accounts.google.com/o/oauth2/v2/auth`.
- Both responses set `oauth_state`.
- Both responses set `oauth_pkce` when `pkce_enabled = true`.

## 8. Browser Test

GitHub:

```text
http://auth.localhost:3000/auth/github?redirect_uri=/auth/providers
```

Google:

```text
http://localhost:3000/auth/google?redirect_uri=/auth/providers
```

Expected result:

- Provider authorization completes.
- Browser redirects back to `/auth/providers`.
- The response shows the configured providers.
- Server logs include `Got profile`, `OAuth success`, and a successful cookie authentication.

Optional DB check:

```bash
PGPASSWORD=password psql -h localhost -U postgres -d constructive -x -c "
SELECT service,
       identifier IS NOT NULL AS has_identifier,
       details->>'email' AS email,
       is_verified,
       created_at
FROM constructive_user_identifiers_private.connected_accounts
WHERE service IN ('github', 'google')
ORDER BY created_at DESC
LIMIT 10;
"
```
