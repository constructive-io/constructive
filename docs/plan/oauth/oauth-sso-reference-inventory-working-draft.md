# OAuth/SSO Reference Inventory (Working Draft)

**Status:** A lightweight queue for item-by-item discussion. Entries marked **confirmed** are approved cross-cutting decisions; all other entries remain pending, and no feature implementation has started.

This draft collects capabilities and practices worth learning from before the latest-baseline rebuild. The legacy CNC OAuth PR #1303, CNC SSO PR #1493, Hub OAuth PR #585, and Hub SSO PR #592 are behavior and regression references only; their commits and file layout are not migration units. Current CNC `main` and CNC DB `main` must be re-checked and frozen when implementation actually begins.

The unmerged constructive-db `feat/sso-callbacks` exploration is deliberately excluded. It is not a target architecture, reference contract, dependency, or compatibility requirement for this rebuild.

For each item below, later discussion should choose one disposition: **reuse an existing public abstraction**, **extend a public abstraction**, **keep a justified local implementation**, or **reject as obsolete**.

## Confirmed rule layers

- **Constructive-wide rules (confirmed):** Shared context, GraphQL, errors, environment, and test infrastructure form the general foundation for every feature.
- **OAuth/SSO specialization (confirmed):** Protocol-specific rules may define security behavior and necessary HTTP exceptions, but must not bypass or duplicate the general Constructive infrastructure.

## Functional capability checklist

### 1. Browser entry and route surface

- **GraphQL-first boundary (confirmed):** Authentication reads and writes should use existing GraphQL Queries or Mutations whenever they can express the required behavior. Add `/auth/*` only for HTTP/browser semantics GraphQL cannot replace, such as redirects, third-party callbacks, and cookie writes or cleanup.
- **OAuth route enablement:** The old OAuth work mounted `/auth` routes only when OAuth was enabled. Confirm that the rebuild keeps an explicit off-by-default switch and which routes should exist when enabled.
- **Provider discovery:** The old flow exposed the enabled providers for the resolved tenant. Confirm the public response shape and whether an unprovisioned tenant returns an empty list or a registered error.
- **Initiation, callback, and error routes:** The old flow separated authorization start, provider callback, and error landing behavior. Confirm the canonical route names, methods, and ownership inside the GraphQL server.

### 2. Provider configuration and secrets

- **Platform versus tenant secrets (confirmed):** Server/platform state protection such as `OAUTH_STATE_SECRET` belongs in `graphql/env`. Provider endpoints, client IDs, scopes, and policy are tenant configuration rather than platform environment settings.
- **Context-bound resolution (confirmed):** Resolve provider metadata and client secrets for the request context's current tenant/database; missing data fails safely with a registered error. Do not use a platform default, cross-tenant lookup, or legacy-version fallback.
- **Internal-secrets lifecycle (confirmed):** Provider client secrets come through the existing CNC/CNC DB internal-secrets contract and its established loader cache, refresh, and rotation lifecycle. Do not store an OAuth-specific duplicate secret.
- **Sensitive-data boundary (confirmed):** Provider raw errors or sensitive metadata, secrets, tokens, cookies, authorization codes, and internal database details must not appear in logs, public responses, browser parameters, or ordinary configuration APIs.
- **Provider support:** The existing OAuth package contains adapters for common providers, while CNC DB can carry runtime provider metadata. Confirm which providers and which level of OAuth2/OIDC behavior are in the first rebuilt scope.

### 3. Authorization Code and PKCE

- **Authorization Code flow:** Preserve the provider redirect, callback code exchange, and normalized profile behavior proven by the old OAuth work. Confirm whether any additional grant or client type is in scope.
- **PKCE:** The old flow generated an S256 verifier/challenge and kept the verifier out of the redirect URL. Confirm whether PKCE is mandatory for all providers or follows a provider policy with a secure default.
- **Token endpoint authentication:** The old OAuth package explored multiple token endpoint authentication methods and request encodings. Confirm the supported methods and how unsupported methods should fail.

### 4. State and callback integrity

- **State integrity and expiry:** The old flow signed state, imposed a short lifetime, and rejected tampering or expiry. Confirm whether signed cookie state remains the desired model and whether one-time server-side storage is also required.
- **Scope binding:** State was bound to provider, authentication origin, database, and API. Preserve the principle that a callback cannot move into a different tenant or API; confirm the final payload fields after freezing current routing contracts.
- **PKCE binding:** The old flow tied the verifier to the same signed state and provider. Confirm the exact rejection and cleanup behavior for missing, mismatched, or replayed values.

### 5. Redirect safety and scoped routing

- **Same-origin redirects:** Relative and same-origin return paths should be accepted without permitting authority-relative URLs or embedded credentials. Confirm the permitted URL forms and normalization rules.
- **Cross-host SSO redirects:** The old SSO work allowed a different registered host only when scoped routing resolved it to an API in the same explicit database. Confirm that same-database rule and whether production always requires HTTPS.
- **Callback revalidation:** The redirect target was resolved again during callback and compared with the target bound into state. Preserve this protection against route changes; confirm how route deletion or reassignment should surface.
- **No fallback database:** Unknown or incomplete routes must fail rather than falling back to a platform/default database. This is a mainline CNC/CNC DB invariant to retain without multi-version compatibility code.

### 6. Identity, sign-in, and sign-up

- **Profile normalization:** Provider-specific data should become one stable identity shape before database operations. Confirm required claims, verified-email semantics, and whether raw provider data may be stored.
- **Existing identity sign-in:** The old Hub E2E proved that a repeated login returns to the same user without duplicate linkage. Confirm the database procedure and canonical error path to use instead of copying old pre-auth lookup SQL.
- **New identity sign-up:** The old flow created a user and connected account on first login. Confirm sign-up policy, missing-email behavior, and rollback guarantees when session creation fails.
- **Verified email:** The old flow could require a verified provider email before creating a new account. Confirm whether this remains a tenant setting and what safe default applies.
- **MFA continuation:** The old callback handled an MFA-required result by redirecting into a challenge step. Confirm whether MFA continuation is in the initial rebuild or a later phase.

### 7. Cookies and sessions

- **Transient OAuth cookies:** State and PKCE cookies should be `HttpOnly`, narrowly scoped to the auth path, short lived, and cleared after callback success or failure. Confirm names, `SameSite`, local HTTP behavior, and cleanup guarantees.
- **Session cookie:** Session issuance should reuse CNC's existing cookie helpers and tenant auth settings rather than introduce OAuth-only cookie configuration. Confirm domain, path, duration, remember-me, secure, and `SameSite` policy.
- **Device token:** The old OAuth callback could propagate a trusted-device token returned by database auth. Confirm whether this belongs in the first rebuild and how its lifetime differs from the session.
- **Shared-session SSO:** The old Hub SSO E2E proved one parent-domain session cookie worked on two separately scoped APIs in the same tenant. Confirm the canonical host matrix and whether this is the complete SSO model for the rebuild.

### 8. Error and failure behavior

- **Provider-returned errors:** Preserve the provider's stable error code only where it is safe, while keeping descriptions sanitized. Confirm which provider fields may appear in redirects and logs.
- **OAuth protocol errors:** Invalid state, invalid PKCE, rejected redirect, missing modules, and callback failure need stable public or internal codes. Confirm the final taxonomy in the shared errors registry rather than in route-local maps.
- **Failure cleanup:** Transient cookies should be cleared and partial database/session work should not survive a failed callback. Confirm retry, replay, and audit expectations.
- **Logout:** The stable plan calls for real browser logout/failure coverage, but the old golden path focused mainly on login. Confirm logout scope across parent-domain hosts before implementation.

### 9. OAuth2 versus OIDC scope

- **Current boundary:** The old Hub tests explicitly exercised a Google-shaped OAuth Authorization Code + PKCE flow and did not claim full OIDC validation. Confirm whether the rebuild initially preserves that scope or must also verify issuer, audience, nonce, discovery, and JWKS.
- **Future compatibility:** Current provider metadata already contains OIDC-oriented fields. If full OIDC is deferred, confirm that the public types and errors do not falsely promise validation that is not implemented.

## Good-practice checklist

### 10. Package and module ownership

- **Protocol versus server lifecycle (confirmed):** Keep reusable OAuth protocol capabilities in `packages/oauth`; GraphQL server and middleware own route mounting, HTTP semantics, cookies, redirects, and orchestration only. The protocol package must not couple itself to one server deployment.
- **Shared capabilities (confirmed):** Tenant context/loaders belong in `packages/express-context`, canonical errors in `packages/errors`, and GraphQL/OAuth server-option parsing in `graphql/env`. Reuse or extend the correct public owner instead of copying helpers into OAuth routes.
- **Dependency discipline:** Prefer an existing CNC public library over a new dependency or local duplicate. Confirm API stability, package layering, and browser/server compatibility before promoting a legacy helper.

### 11. Express context first

- **Complete request context (confirmed):** `req.constructive` is not merely a loader registry or request cache; it carries the already-resolved tenant, API, database, route, request ID, session, user, and tenant database access. OAuth/SSO middleware must reuse these request facts rather than infer tenant/database/routing again or build a parallel auth context.
- **Load through that context (confirmed):** Provider, auth-policy, and other tenant configuration should be read on demand through the context's established loaders and cache lifecycle. Do not bypass the context with route-local configuration discovery or a separate loader registry.
- **Established middleware lifecycle:** Keep host/API resolution, authentication decisions, context construction, CSRF, OAuth routes, GraphQL, and final error handling in one deliberate order. Confirm how `/auth/*` treats a stale existing session without bypassing unrelated security middleware.
- **`withPgClient`:** Run tenant auth procedures through the shared transaction/RLS helper wherever its security model applies. Any privileged pre-auth operation needs an explicit, reviewed reason.

### 12. Public loaders before route-local SQL

- **Loader registry:** Reuse lazy, database-keyed module loaders and their cache/invalidation lifecycle. Do not add an OAuth-only cache or unkeyed metadata lookup.
- **Auth settings:** Current mainline Express context is the candidate owner for cookie and tenant auth policy. Confirm whether OAuth state lifetime, verified-email policy, and error path should extend that public loader.
- **Identity providers:** Current mainline has a provider loader and an opt-in registration model. Confirm whether it already satisfies the frozen CNC DB contract before extending it.
- **Auth surface:** Current mainline can resolve tenant auth schemas and generated procedure locations. Prefer that abstraction over copying the old connected-account/user-auth discovery loaders.

### 13. Unified errors library

- **Canonical registry (confirmed):** Use `@constructive-io/errors` as the source of truth for stable code, public/internal classification, HTTP status, message, and typed context. Required OAuth/SSO codes must be formally registered there.
- **Stable business naming (confirmed):** Public codes use `UPPER_SNAKE_CASE` and describe business semantics, not packages, files, routes, middleware, exception classes, or implementation ownership. A code may use a business-domain prefix such as `OAUTH`, `SSO`, or `IDENTITY_PROVIDER`, but its name must not change when code moves between modules.
- **Naming patterns (confirmed):** Continue authentication method or business object plus action/state (`SSO_SIGN_IN_DISABLED`), use `INVALID_` plus the explicit object for security validation (`INVALID_OAUTH_STATE`, `INVALID_OAUTH_PKCE`), and object plus state for configuration failures (`IDENTITY_PROVIDER_NOT_CONFIGURED`).
- **No internal or sensitive provenance (confirmed):** Internal module/source details belong only in redacted structured log context. Never expose raw provider errors, tokens, cookies, authorization codes, or internal database details through error codes or public responses.
- **Existing database errors:** Reuse current identity, session, account, email-verification, step-up, and SSO policy errors when their meaning matches. Do not create OAuth-prefixed aliases for an existing canonical refusal.
- **Transport mapping:** REST JSON, browser redirects, GraphQL, and logs should all derive from the same registered error. Unknown codes should remain internal and fail loudly instead of leaking messages or silently becoming an incorrect status.
- **Candidate code families:** Later review should cover configuration, provider, redirect, state, PKCE, callback, identity/session, and scoped-routing failures. Exact names and classifications remain to be confirmed item by item.
- **No swallowed exceptions (confirmed):** Every caught failure must become a classified domain/protocol result or be rethrown with its cause preserved. Revisit every legacy catch/fallback path; a log line, empty result, or generic fallback cannot silently replace failure semantics.

### 14. 12-factor configuration semantics

- **Tool-layer ownership (confirmed):** `12factor-env` provides reusable default, development-default, required-value, parser, and validator behavior. It does not own PostgreSQL, GraphQL, or OAuth business options.
- **`withDefault` (confirmed):** Use an all-environment fallback only when the value is genuinely safe everywhere. OAuth enablement may default off; secrets must not receive a production-safe-looking built-in value.
- **`devDefault`:** Development/test convenience may use a clearly marked local value while production remains required. Confirm whether a development-only state secret is acceptable or whether every enabled environment must provide one.
- **`required` (confirmed):** When OAuth is enabled, required secrets and structural settings should fail during option resolution/startup, not during the first callback. Disabled OAuth should not require irrelevant secrets.
- **Typed validators:** Reuse `12factor-env` boolean, URL, string, list, and custom validator patterns. Confirm whether `OAUTH_ENABLED` accepts only explicit `"true"`/`"false"` or the broader house boolean syntax.
- **Hard boundary (confirmed):** Select `withDefault`, `devDefault`, `required`, and existing parsers/validators by value semantics; do not hand-write a parallel parser. Any missing general parser should be considered for the owning env library first.

### 15. `pgpmjs/env` and `graphql/env` ownership

- **`pgpm/env` ownership (confirmed):** `@pgpmjs/env` owns only PGPM/PostgreSQL runtime settings and reuses `12factor-env` tools. It must not accept GraphQL-server-specific OAuth configuration.
- **`graphql/env` ownership (confirmed):** `@constructive-io/graphql-env` owns GraphQL server and OAuth server-option definitions, defaults/config/environment/runtime merging, and final validation.
- **Middleware boundary (confirmed):** OAuth/SSO middleware consumes only the merged, validated server options and tenant settings. It must not read `process.env` or reconstruct option precedence locally.
- **Secret hygiene (confirmed):** Never expose secrets through logs, error responses, browser parameters, or ordinary configuration APIs. Hub may use a fixed, clearly test-only state secret only in local/CI configuration.

### 16. Testing at the narrowest useful layer

- **`packages/oauth` harness and scope (confirmed):** Reuse its current Jest/ts-jest infrastructure for provider interaction, PKCE, state, token exchange, profile normalization, and other reusable protocol primitives.
- **Semantic rewrite boundary (confirmed):** Legacy runtime provider resolver, PKCE/signed-state, and token-auth test code cannot be migrated or compiled unchanged because those additions are absent from current main. Keep their validated behavior/security intent, then rewrite against the frozen baseline API and confirmed error naming.
- **Other public owners:** `packages/errors`, `graphql/env`, and Express context should each test their own public extension; confirm their exact cases as the corresponding implementation decisions are made.
- **Database/RLS scope boundary (confirmed):** `pgsql-test` is the existing infrastructure for database functions, RLS, and role/tenant context, but it is not a default OAuth/SSO test layer. Add tests in the corresponding DB owner only when the implementation changes authentication, identity-linking, session procedures, RLS, or role-context contracts; do not add isolated DB tests for OAuth routes alone.
- **Real GraphQL server integration (confirmed):** Reuse `graphql-server-test` with the real GraphQL server/database, SuperTest request, and existing seed/routing lifecycle for callbacks, redirects, cookies, scoped tenant/API routing, unknown hosts, and no-default fallback.
- **Harness boundary (confirmed):** Context, routing, and cookie seams should use that real helper; do not migrate the legacy large custom Express/http plus mocked-context middleware harness as the default. Pure protocol-function tests remain in their owning package.
- **OAuth options forwarding (implementation requirement):** Once `graphql/env` OAuth server options are finalized, add a small typed forwarding path to `graphql-server-test`. Follow the new validated contract rather than copying the legacy `input.oauth` type.
- **CNC browser scope (confirmed):** `@constructive-io/playwright-test` is CNC's general real-server/isolated-DB browser infrastructure, not an OAuth/SSO-specific facility. This rebuild adds no CNC OAuth/SSO browser layer; package unit and server integration tests own protocol, callback, cookie-header, and routing coverage.
- **Hub external seam (confirmed):** Hub retains a real browser authorization-code flow against the mock provider boundary, repeat login resolving to the same publicly observed account, and parent-domain cookie/shared session working across scoped hosts. Evaluate CNC Playwright separately only for a future CNC-owned browser behavior.
- **Internal assertion boundary (confirmed):** Hub must not query private `connected_accounts` or other internal tables. Identity de-duplication, identity-linking procedures, and DB-internal invariants belong to the CNC/DB owner tests; do not migrate the legacy raw `pg.Pool` private-table assertion. This is a test-responsibility change, not a product-function move.
- **Provider mock boundary (confirmed):** Routine automation mocks only provider authorization/token/userinfo endpoints; CNC/Hub routing, context, cookies, DB, and sessions stay real in their owning layers. Real providers are limited to controlled staging/manual smoke and do not enter regular CI.
- **Fixture promotion threshold (confirmed):** Keep provider simulators and multi-host tooling local first. Extract a narrow public helper only when a second independent, stable scenario reuses it with a clear boundary; do not build a general test framework in advance.
- **Existing infrastructure boundary (confirmed):** Use an existing CNC `*-test` package whenever it matches the target. A new harness requires explicit evidence that current packages do not provide the needed lifecycle or isolation.
- **Cross-cutting section status (confirmed):** Public-practice and test-ownership boundaries are complete for this rebuild; exact scenario cases remain with their feature-level discussions.

### 17. Hub pin and attribution discipline

- **Four gitlinks:** Hub pins CNC, CNC DB, Dashboard, and Functions independently. Record all four exact gitlinks even when only CNC/CNC DB are intentionally advanced.
- **Baseline → OAuth → SSO:** First prove the latest non-OAuth baseline, then pin the OAuth commit and test OAuth, then pin the SSO child commit and retain OAuth regression coverage. Do not mix all causes into one CI result.
- **Exact SHA authority:** The committed Hub tree is authoritative; a local submodule checkout or branch name is not. Re-check refs and freeze exact SHAs only when implementation begins.
- **Re-prove auxiliary pins:** Old Dashboard/Functions pins and workflow changes were needed for one historical integration snapshot. Carry them forward only when the new baseline demonstrates the same contract need.
- **No inherited workaround:** Dashboard sharding, timeout increases, branch guards, and other temporary cross-PR CI changes are investigation inputs, not automatic rebuild requirements.

### 18. Logging, cleanup, and review discipline

- **Semantic port only:** Preserve behavior, security boundaries, tests, and genuinely reusable ideas; do not copy apply/revert history, old file structure, or the full legacy diff.
- **No multi-version fallback:** Implement the frozen CNC/CNC DB main contract. Historical metadata fallbacks or default-database behavior require new evidence and explicit approval.
- **No debug residue:** Production logging must use established structured logging and redact secrets/tokens. Temporary routes, broad error descriptions, console debugging, and CI-only bypasses should not enter the rebuilt feature.
- **Cause-aware observability:** Logs should carry request/tenant/provider context without credentials, state, authorization codes, cookies, or raw tokens. Logging supplements the canonical error path; it must not consume the exception or change its outcome.
- **One disposition per item:** Before coding any legacy behavior, record whether it is reused, added to a public library, kept locally with reason, or rejected. Confirmed outcomes can then be promoted into the adjacent stable decision record.

## Suggested discussion order

1. Express context, public loaders, and the `/auth` request lifecycle.
2. Unified errors and the public/internal OAuth/SSO error families.
3. 12-factor behavior and `pgpmjs/env` versus `graphql/env` ownership.
4. Browser functionality: PKCE, state, redirect boundaries, identity behavior, and cookies.
5. Test ownership and the Hub cross-host E2E contract.
6. Four-gitlink baseline, OAuth, and SSO pin gates.

Implementation detail, exact code evidence, final names, and trade-offs should be added only when the corresponding item is discussed and confirmed.
