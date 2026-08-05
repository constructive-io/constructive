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
- **OAuth route enablement (confirmed):** The server feature flag is explicit and defaults off. Disabled OAuth mounts no authorization-initiation or provider-callback browser routes and requires neither the state secret nor provider configuration; enabled OAuth validates required server options during resolution/startup.
- **Provider discovery (confirmed):** GraphQL lists only providers configured and enabled for the current tenant while server OAuth is enabled. Disabled OAuth or a tenant with no enabled providers returns an empty list; the legacy `/auth/providers` discovery/landing endpoint is not migrated.
- **Minimal HTTP route boundary (confirmed):** `/auth/*` retains only authorization initiation redirecting to the provider, callback receipt of `code`/`state`/`error`, and redirect of the unified result to verified frontend success/failure locations. Login-method and other read-only discovery remains GraphQL.
- **Security-flow continuity (confirmed):** Core authorization redirect/callback behavior and its security protections remain intact. Only the auxiliary HTTP API surface is reduced.

### 2. Provider configuration and secrets

- **Platform versus tenant secrets (confirmed):** Server/platform state protection such as `OAUTH_STATE_SECRET` belongs in `graphql/env`. Provider endpoints, client IDs, scopes, and policy are tenant configuration rather than platform environment settings.
- **Context-bound resolution (confirmed):** Resolve provider metadata and client secrets for the request context's current tenant/database; missing data fails safely with a registered error. Do not use a platform default, cross-tenant lookup, or legacy-version fallback.
- **Internal-secrets lifecycle (confirmed):** Provider client secrets come through the existing CNC/CNC DB internal-secrets contract and its established loader cache, refresh, and rotation lifecycle. Do not store an OAuth-specific duplicate secret.
- **Sensitive-data boundary (confirmed):** Provider raw errors or sensitive metadata, secrets, tokens, cookies, authorization codes, and internal database details must not appear in logs, public responses, browser parameters, or ordinary configuration APIs.
- **Google and GitHub first (confirmed):** The initial rebuild supports Google and GitHub while keeping one provider-neutral authorization lifecycle. Provider adapters may own endpoint, encoding, token-authentication, and profile-normalization differences, but may not fork route, callback, state, PKCE, identity, or session behavior.

### 3. Authorization Code and PKCE

- **Authorization Code + S256 PKCE (confirmed):** Preserve the old OAuth PR's validated semantics and require this as the default path for every provider, not an optional enhancement for selected providers.
- **One-time binding (confirmed):** Each authorization initiation creates one verifier/challenge; the verifier stays out of the redirect URL and is bound to that same callback and token exchange.
- **Unsupported provider boundary (confirmed):** A provider unable to satisfy mandatory S256 PKCE is rejected; do not introduce a downgrade or compatibility fallback.
- **Token endpoint authentication (confirmed boundary):** Keep provider-specific token authentication and request encoding behind the common adapter boundary. Select exact supported methods from the frozen public API during implementation, and fail unsupported methods explicitly through the canonical error contract.

### 4. State and callback integrity

- **Signed one-time receipt (confirmed):** State is signed, short lived, and valid for one authorization only. It binds the initiating provider, request-context tenant/database, origin API/host, verified return target, and same-flow PKCE relation.
- **Callback revalidation (confirmed):** Re-resolve the callback's current route/context and compare every state binding. Reject tenant/database/host/API/provider/state/PKCE mismatch, tampering, reuse, or expiry so one tenant's flow cannot be consumed by another tenant or API.

### 5. Redirect safety and scoped routing

- **Phase-one same-origin return (confirmed):** Base OAuth may return only to a relative path or full same-origin URL on the exact host/API that initiated authorization. Reject every different-host redirect.
- **Cross-host SSO later (confirmed):** Same-tenant/database verification, parent-domain cookie, shared session, and cross-host route revalidation remain in scope as a separate phase after base OAuth is stable; they are not part of phase-one redirect handling. Exact parent-domain/sibling-host eligibility, HTTPS and local-test behavior, cross-host logout/cleanup, and route deletion or reassignment handling are intentionally decided when that phase begins.
- **Complexity boundary (confirmed):** This staging removes cross-host redirect, cookie, and routing decisions from initial OAuth without cancelling SSO.
- **No fallback database:** Unknown or incomplete routes must fail rather than falling back to a platform/default database. This is a mainline CNC/CNC DB invariant to retain without multi-version compatibility code.

### 6. Identity, sign-in, and sign-up

- **Minimal profile normalization (confirmed):** Normalize provider data before database work and persist only the minimum stable identity fields required by the owned contract: provider, provider subject, necessary display/profile fields, and email-verification metadata. Do not persist raw userinfo or token responses as an OAuth shortcut.
- **First-login auto-creation (confirmed):** If a provider identity has no existing association, the flow may create a user and establish the identity/provider association to reduce signup friction.
- **Repeated identity reuse (confirmed):** The same provider identity must always resolve to its originally associated user on later login. Never create a second user or a duplicate identity/provider association; this and first-login creation form one complete lifecycle.
- **Provider email verification metadata (confirmed):** `email_verified` or an equivalent field is metadata, not a signup gate. Missing or false provider verification does not block first-login user/association creation; provider subject/identity is the login association key.
- **Email trust boundary (confirmed):** An unverified email cannot trigger automatic account merge, account recovery, additional authorization, or another security grant.
- **Authorization boundary (confirmed):** Creating that user grants no business authorization, tenant role, schema/API access, or data access. Existing administrator grants and access-control mechanisms remain authoritative.
- **Resolution implementation check:** Verify the owning procedure and canonical error path against the frozen baseline without copying legacy pre-auth lookup SQL.
- **Creation failure/rollback (confirmed):** User creation and identity association must be atomic and safely idempotent for the same provider identity. Failure leaves no orphan user or association; a final session follows only after durable association and any required local MFA.
- **Email storage and later policy:** The minimal-data boundary is confirmed; resolve the exact owned schema representation and any later explicit policy consumption against the frozen baseline during implementation.
- **Provider-owned MFA (confirmed):** Upstream provider MFA is completed and owned by that provider; CNC does not reproduce or separately verify it.
- **Constructive MFA continuation (confirmed):** When the current tenant's existing policy requires local MFA, callback authentication continues into the existing challenge and creates the final session only after success. With no local requirement, OAuth success may create the session directly.
- **MFA transport/state check:** Verify the existing challenge transport, continuation state, expiry, and failure details during implementation; this is not a new product-scope decision.

### 7. Cookies and sessions

- **Transient OAuth cookies (confirmed):** State and PKCE cookies are short lived, `HttpOnly`, narrowly scoped, and cleared after callback success or failure. Resolve exact names, lifetime, `SameSite`, secure behavior, and local-HTTP exceptions from the frozen shared helper and callback-method contract rather than route-local defaults.
- **Session cookie (confirmed):** Session issuance reuses CNC's existing cookie helpers and tenant auth settings and does not introduce OAuth-only session configuration. Exact domain, path, duration, remember-me, secure, and `SameSite` values remain owned by that existing contract.
- **Device token (confirmed scope):** Exclude the legacy trusted-device token from phase one unless the frozen existing MFA/session contract proves it is required; legacy presence alone is not a reason to migrate it.
- **Shared-session SSO (confirmed deferred detail):** Parent-domain shared-session behavior remains the phase-two goal. Freeze its canonical host matrix and complete cookie/logout model only when that SSO phase begins.

### 8. Error and failure behavior

- **Provider-returned errors (confirmed):** Do not forward raw provider error fields or descriptions to the browser. Map them to registered safe errors and expose at most a non-sensitive request identifier for correlation.
- **OAuth protocol errors:** Invalid state, invalid PKCE, rejected redirect, missing modules, and callback failure need stable public or internal codes. Finalize the exact taxonomy in the shared errors registry during implementation rather than in route-local maps.
- **Failure cleanup (confirmed):** Every failed callback clears transient state, rejects replay, and leaves no partial identity, database, or session work. Retry and audit details must preserve those guarantees through their owning public contracts.
- **Logout staging (confirmed):** Phase one reuses existing same-origin logout behavior. Parent-domain and cross-host logout and cookie cleanup are defined and tested with the later SSO host matrix.

### 9. OAuth2 versus OIDC scope

- **Current boundary (confirmed):** Google and GitHub share the initial OAuth 2.0 Authorization Code + mandatory S256 PKCE flow. Full OIDC verification, including issuer, audience, nonce, discovery, and JWKS, is deferred to a separately confirmed scope.
- **Future compatibility (confirmed):** Public types and errors must describe only implemented OAuth behavior and must not imply that deferred OIDC validation already exists.

## Good-practice checklist

### 10. Package and module ownership

- **Protocol versus server lifecycle (confirmed):** Keep reusable OAuth protocol capabilities in `packages/oauth`; GraphQL server and middleware own route mounting, HTTP semantics, cookies, redirects, and orchestration only. The protocol package must not couple itself to one server deployment.
- **Shared capabilities (confirmed):** Tenant context/loaders belong in `packages/express-context`, canonical errors in `packages/errors`, and GraphQL/OAuth server-option parsing in `graphql/env`. Reuse or extend the correct public owner instead of copying helpers into OAuth routes.
- **Dependency discipline:** Prefer an existing CNC public library over a new dependency or local duplicate. Verify API stability, package layering, and browser/server compatibility before promoting a legacy helper.

### 11. Express context first

- **Complete request context (confirmed):** `req.constructive` is not merely a loader registry or request cache; it carries the already-resolved tenant, API, database, route, request ID, session, user, and tenant database access. OAuth/SSO middleware must reuse these request facts rather than infer tenant/database/routing again or build a parallel auth context.
- **Load through that context (confirmed):** Provider, auth-policy, and other tenant configuration should be read on demand through the context's established loaders and cache lifecycle. Do not bypass the context with route-local configuration discovery or a separate loader registry.
- **Established middleware lifecycle:** Keep host/API resolution, authentication decisions, context construction, CSRF, OAuth routes, GraphQL, and final error handling in one deliberate order. Verify the frozen lifecycle's stale-session behavior for `/auth/*` without bypassing unrelated security middleware.
- **`withPgClient`:** Run tenant auth procedures through the shared transaction/RLS helper wherever its security model applies. Any privileged pre-auth operation needs an explicit, reviewed reason.

### 12. Public loaders before route-local SQL

- **Loader registry:** Reuse lazy, database-keyed module loaders and their cache/invalidation lifecycle. Do not add an OAuth-only cache or unkeyed metadata lookup.
- **Auth settings:** Current mainline Express context is the candidate owner for cookie and tenant auth policy. Verify against the frozen baseline whether any missing OAuth state-lifetime or error-path capability belongs in that public loader.
- **Identity providers:** Current mainline has a provider loader and an opt-in registration model. Verify whether it satisfies the frozen CNC DB contract before extending it.
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
- **`devDefault`:** Development/test convenience may use a clearly marked local value while production remains required. Resolve a development-only state secret through the frozen house convention; never weaken the enabled production requirement.
- **`required` (confirmed):** When OAuth is enabled, required secrets and structural settings should fail during option resolution/startup, not during the first callback. Disabled OAuth should not require irrelevant secrets.
- **Typed validators:** Reuse `12factor-env` boolean, URL, string, list, and custom validator patterns. Follow the frozen house boolean syntax for `OAUTH_ENABLED` rather than inventing an OAuth-specific parser.
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

## Remaining implementation follow-up

The high-level phase-one OAuth product and security decisions in this inventory are now complete. Remaining checks are tied to concrete baseline evidence rather than additional product scope:

1. Freeze all five component refs/SHAs and verify current public loaders, procedures, middleware order, environment parsers, cookie helpers, and MFA continuation behavior.
2. Finalize exact registered error names, adapter token-auth methods, package extensions, and scenario tests against those frozen APIs.
3. Prove the Hub baseline, then OAuth, then the later SSO pin in separate attributable gates.
4. When phase two begins, confirm its exact host matrix, HTTPS/local behavior, route reassignment handling, and cross-host logout/cleanup.
