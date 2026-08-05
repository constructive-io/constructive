# Tenant shared-session SSO

This design supports one tenant using a shared CNC session across multiple API
hosts:

```text
auth.tenanta.com/auth/google
  -> Google
  -> auth.tenanta.com/auth/google/callback
  -> Set-Cookie: constructive_session; Domain=tenanta.com; Path=/; ...
  -> api1.tenanta.com
```

CNC remains an OAuth client of Google, GitHub, or another external identity
provider. It is not an OIDC provider and does not issue OIDC tokens to the
tenant APIs.

## Required topology

The Auth API and every API that shares the session must:

- resolve through the CNC scoped routing plane;
- have the same explicit CNC `databaseId` and physical database;
- share the users, connected accounts, sessions, and session credentials
  auth schema;
- use the same session cookie name, Domain, and Path; and
- run with `strictAuth=false`.

They may have different `apiId` values and expose different business schemas.

> Current shared-session SSO requires `strictAuth=false`. Cross-origin support
> for strict authentication is a separate design and PR. This flow does not
> modify, bypass, or downgrade `authenticate_strict`.

## Session cookie configuration

Use the existing database auth settings. For the example above:

```text
cookie_domain = tenanta.com
cookie_path = /
cookie_secure = true
cookie_httponly = true
cookie_samesite = lax
```

`constructive_session` is set and cleared with the same settings by the common
cookie configuration helpers. When `cookie_domain` is absent, the cookie
remains host-only.

Every subdomain that can receive a parent-domain session cookie must be in the
same security boundary. Do not use a parent domain that contains
user-controlled or lower-trust hosts. Production deployments must use HTTPS.

OAuth `oauth_state` and `oauth_pkce` cookies remain host-only and scoped to
`/auth`; they are never parent-domain cookies. The provider callback therefore
continues to return to the Auth API:

```text
https://auth.tenanta.com/auth/{provider}/callback
```

The existing trusted-device cookie currently derives its Domain from the same
`cookie_domain` auth setting. That pre-existing coupling can broaden the device
cookie along with the session cookie and should be included in the deployment
security review. This SSO change does not introduce a separate device-cookie
scope.

When migrating from a host-only `constructive_session` to a domain cookie with
the same name, a browser may temporarily send both cookies. Deployments should
clear the old host-only cookie first or use a planned versioned migration to
avoid ambiguous authentication.

## OAuth redirect trust

A relative redirect stays on the Auth API. An absolute cross-origin redirect
is accepted only when all of these are true:

1. The URL is HTTP(S), contains no username/password, and uses HTTPS in
   production.
2. Its normalized host resolves through the configured scoped routing schema's
   `resolve_route()` contract.
3. The result is an API surface with explicit `apiId` and `databaseId`.
4. Its `databaseId` exactly matches the Auth API's `databaseId`.

The API IDs may differ. Similar hostnames, parent-domain suffixes, CORS
allowlists, client-provided database IDs, and legacy/default database routing
do not establish trust.

Signed OAuth state binds both sides:

- provider, Auth API database/API IDs, and Auth origin;
- normalized final redirect URI; and
- target database/API IDs and target origin.

The callback re-resolves the target and compares it with the signed values.
Route removal or reassignment during login fails safely. OAuth and validation
errors stay on the Auth API. An MFA redirect receives only the already
validated final redirect URI.

OAuth redirect validation, CORS, and CSRF are separate mechanisms:

- scoped routing plus matching `databaseId` authorizes the login redirect;
- each API still needs its own credentialed CORS policy; and
- each API still enforces its normal CSRF protections for state-changing
  requests.

## Boundaries

This design does not provide:

- cross-tenant or cross-database identity/session sharing;
- SSO across different top-level domains;
- a CNC OIDC provider;
- authorization-code-style session handoff;
- `request_cross_origin_token` or `sign_in_cross_origin`; or
- cross-origin `authenticate_strict` semantics.

Logout must execute the normal database sign-out/revoke operation and clear the
parent-domain session cookie with the same Domain and Path used at sign-in.
