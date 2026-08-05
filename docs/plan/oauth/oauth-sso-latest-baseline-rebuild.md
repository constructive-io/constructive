# OAuth/SSO Latest-Baseline Rebuild

**Status:** Planning decision record; no implementation has started. Update this document as baselines and ownership decisions are frozen.

Working research and item-by-item confirmation queue: [OAuth/SSO reference capability inventory](./oauth-sso-reference-inventory-working-draft.md).

## Goal

Rebuild the Hub OAuth/SSO work as a semantic port onto the latest, explicitly frozen CNC and CNC DB baselines. Do not continue a hard rebase on the stacked legacy OAuth/SSO branches. Those branches remain useful only as references for intended behavior, security boundaries, and tests.

This planning branch does not migrate, rewrite, rebase, or cherry-pick OAuth/SSO feature code.

## Baseline Context

- Hub `main` is substantially behind both CNC `main` and CNC DB `main`; baseline upgrades and OAuth/SSO changes must therefore be isolated so failures can be attributed correctly.
- Hub contains four independent gitlinks: CNC, CNC DB, Dashboard, and Functions. Their changes must be pinned, reviewed, and validated separately rather than explained as one combined upgrade.
- “Latest baseline” means a set of commit SHAs re-verified and frozen at the start of actual development, not SHAs remembered from an earlier session.

## Delivery Sequence and Gates

### 1. Establish the Hub latest baseline

- Freeze the intended CNC, CNC DB, Dashboard, and Functions gitlink commits independently.
- Bring up Hub without OAuth/SSO feature migration and classify regressions by gitlink or integration boundary.
- Gate: Hub startup and existing auth/session integration checks pass; Dashboard and Functions smoke checks pass; each gitlink delta is documented.

### 2. Port OAuth semantics

- Reimplement only the required OAuth behavior against the frozen baseline, using the legacy branches as behavioral and test references.
- Preserve the validated security contract, including PKCE, state/cookie handling, scoped routing, and stable error mapping.
- Gate: provider integration tests and a real browser E2E pass across the participating hosts, including redirect, callback, session, and cookie behavior.

### 3. Port SSO semantics

- Add SSO only after the OAuth boundary and callback ownership are stable.
- Implement the browser flow within the CNC/Hub rebuild against only the capabilities present in the frozen CNC and CNC DB `main` baselines.
- Gate: SSO integration tests and real cross-host session/cookie E2E pass, with OAuth regression coverage retained.

## Fixed Architecture Boundary

The target boundary is decided:

- Frozen CNC `main` and CNC DB `main` are the only implementation baselines.
- The CNC/Hub rebuild owns the OAuth/SSO browser entry and implementation, including the CNC GraphQL server `/auth` surface.
- CNC DB contributes only contracts and capabilities actually present on its frozen `main`. The rebuild will not add adapters or compatibility layers for unmerged callback experiments.
- Each browser-flow transition must have one explicit owner inside the CNC/Hub implementation.

Audit and assign the following within that fixed boundary before implementation:

- **Overlap to remove:** duplicate callback handling, provider/config lookup, state or PKCE lifecycle, redirect validation, cookie/session issuance, error mapping, or scoped routing found in the frozen mainline code.
- **Complementary responsibilities to preserve:** CNC/Hub browser request context and `/auth` routing alongside stable CNC DB schema, functions, configuration, and policy capabilities present on `main`.
- **Conflicts to resolve:** duplicate callback ownership; state consumed twice; divergent cookie names, domains, `SameSite`, security, or expiry rules; incompatible redirect/error contracts; competing scoped-routing resolution.
- **Implementation ownership to assign:** initial browser route; provider configuration; state/PKCE lifecycle; final callback; session creation; audit events; public error contract; cross-host routing; and test fixtures.

### Non-target exploratory branch

The constructive-db `feat/sso-callbacks` branch is an independent exploration whose author does not currently plan to merge it. It is not a target architecture, behavioral contract, integration dependency, or compatibility requirement for this rebuild. Its `sso-callbacks`, `sso-core`, and SSR callback lane should be ignored unless a later, separately approved decision changes their upstream status.

## Confirmed General and OAuth/SSO Rules

- **Two rule layers:** Constructive-wide rules define the shared context, GraphQL, errors, configuration, and testing foundations. OAuth/SSO-specific rules may document protocol details and necessary HTTP exceptions, but the specialized implementation must not bypass the general infrastructure.
- **Package and server ownership:** Reusable OAuth protocol capabilities belong in `packages/oauth`; GraphQL server and middleware own only route mounting, HTTP semantics, cookies, redirects, and orchestration. General capabilities must be reused or extended in their correct public owner rather than copied into local helpers.
- **Complete Express request context:** The established request context is the source of already-resolved tenant, API, database, route, request ID, session, and user facts, as well as request-scoped loaders and caches. OAuth/SSO middleware must reuse that complete context and use its loaders for on-demand configuration; it must not independently infer routing or create a parallel auth context.
- **GraphQL-first auth surface:** Authentication reads and writes that existing GraphQL Queries or Mutations can express must remain GraphQL operations rather than new HTTP routes. `/auth/*` is reserved for irreducible HTTP/browser behavior such as redirects, third-party provider callbacks, and cookie writes or cleanup; OAuth-specific documentation may describe those exceptions explicitly.
- **Explicit OAuth enablement:** The OAuth server feature flag is explicit and defaults off. When disabled, authorization-initiation and provider-callback browser routes are not mounted, and OAuth state secrets or provider configuration are not required; when enabled, required server configuration must fail validation during options resolution or startup.
- **Tenant provider discovery:** GraphQL returns a provider only when server OAuth is enabled and that provider is configured and enabled for the current request context's tenant. When OAuth is disabled or the tenant has no enabled providers, discovery returns an empty list so clients consume the server decision rather than infer availability.
- **Minimal OAuth HTTP routes:** Provider discovery, available login methods, and other read-only information use GraphQL Queries; the legacy `/auth/providers` discovery/landing endpoint is not migrated. `/auth/*` retains only authorization initiation that redirects the browser to the provider, provider callback receipt of `code`/`state`/`error`, and redirecting the unified result to verified frontend success or failure locations.
- **Security-flow continuity:** The core authorization redirect and callback security flow remains behaviorally intact. This decision reduces only the auxiliary HTTP API surface and does not remove state, PKCE, redirect validation, tenant binding, cookie, session, or error-handling protections.
- **Initial providers and common flow:** The first rebuilt scope supports Google and GitHub through one provider-neutral authorization lifecycle. Provider adapters may supply endpoint, request-encoding, token-authentication, and profile-normalization differences, but must not create parallel route, callback, state, PKCE, identity, or session implementations.
- **Initial protocol boundary:** The first scope promises OAuth 2.0 Authorization Code behavior with mandatory S256 PKCE, not complete OIDC verification. Issuer, audience, nonce, discovery, and JWKS validation require a later explicit scope decision, and public types or errors must not imply that deferred behavior already exists.
- **Authorization Code with mandatory S256 PKCE:** Preserve the legacy OAuth PR's validated Authorization Code + S256 PKCE semantics and make them the required path for every enabled provider. Each authorization initiation creates a one-time verifier/challenge; the verifier never enters the redirect URL and is bound to that same callback and token exchange. A provider that cannot satisfy this contract is rejected rather than receiving a downgrade or fallback path; the exact supported token-endpoint authentication methods are selected from the frozen public API during implementation and unsupported methods fail explicitly.
- **Signed one-time state receipt:** State is signed, short lived, and usable for one authorization only. It binds the initiating provider, request-context tenant/database, origin API/host, verified return target, and the same-flow PKCE relation.
- **Callback integrity revalidation:** The callback re-resolves the current route and complete request context, then compares every binding against state. Reject any tenant, database, host/API, provider, state, or PKCE mismatch, tampering, reuse, or expiry so a flow initiated for one tenant cannot be consumed by another tenant or API.
- **Phase-one same-origin return:** Initial OAuth supports only complete-host same-origin return. A flow initiated from an exact host/API may return only to a relative path on that origin or a full URL with that same origin; every different-host redirect is rejected.
- **Cross-host SSO as a later phase:** Same-tenant/database verification, parent-domain cookies, shared sessions, and cross-host route revalidation remain required SSO goals but are implemented and validated only after base OAuth is stable. This staging removes cross-host redirect, cookie, and routing choices from the first OAuth phase without cancelling SSO. Eligible parent domains and sibling hosts, HTTPS and local-test behavior, cross-host logout/cleanup, and route deletion or reassignment behavior are deliberately confirmed only when that second phase begins.
- **Unified errors and stable naming:** All failures use the `@constructive-io/errors` registry and public codes use `UPPER_SNAKE_CASE` stable business meaning, never package, file, route, middleware, exception-class, or other implementation details. Use only business-domain prefixes such as `OAUTH`, `SSO`, or `IDENTITY_PROVIDER`; follow authentication method or business object plus action/state naming (for example `SSO_SIGN_IN_DISABLED`), `INVALID_` plus the validated object for security failures (for example `INVALID_OAUTH_STATE` or `INVALID_OAUTH_PKCE`), and object plus state for configuration failures (for example `IDENTITY_PROVIDER_NOT_CONFIGURED`). Every caught failure must be mapped to this canonical contract or rethrown with its cause preserved; it must never be swallowed.
- **Provider and secret ownership:** Server/platform secrets such as `OAUTH_STATE_SECRET` belong to `graphql/env`. Provider endpoints, client IDs, scopes, and policy are tenant configuration, while provider client secrets are resolved through the existing CNC/CNC DB internal-secrets contract.
- **Tenant-safe secret resolution:** Resolve provider metadata and secrets for the current tenant/database through the complete request context and its established loaders. Missing data must fail safely with a registered error; platform defaults, cross-tenant lookup, legacy fallback, and duplicate OAuth-specific secret copies are forbidden, and existing loader cache/refresh/rotation lifecycles must be reused.
- **Sensitive-data boundary:** Internal provenance belongs only in safe structured log context. Provider raw errors or sensitive metadata, secrets, tokens, cookies, authorization codes, and internal database details must not enter logs, public errors, browser parameters, or ordinary configuration APIs.
- **First-login identity creation:** When a provider identity first signs in and no association exists, the flow may automatically create a user and establish the identity/provider association to reduce account-creation friction.
- **Repeated identity login:** A later login with the same provider identity must resolve and return the originally associated user. It must never create a second user or a second identity/provider association; together with first-login creation, this defines the complete identity login lifecycle.
- **Provider email verification as metadata:** Provider `email_verified` or an equivalent field is metadata for later policy use, not a first-login gate. A missing or false provider-specific verification field does not block automatic user creation and identity association; the provider subject/identity is the login association key.
- **No email-based trust escalation:** An unverified provider email must not drive automatic account merging, account recovery, additional authorization, or any security grant.
- **Minimal normalized identity data:** Normalize provider data before database work and persist only the minimum stable identity fields needed by the owned contract, including provider, provider subject, necessary display/profile fields, and email-verification metadata. Do not persist raw userinfo responses, token responses, or provider payloads as an OAuth shortcut.
- **Atomic and idempotent identity lifecycle:** User creation and identity association must succeed atomically and support safe retry by the same provider identity. Failure must not leave an orphan user or association, and a final session is issued only after durable association and any required local MFA have succeeded.
- **Provider-owned MFA:** MFA performed by an upstream provider, such as during Google login, remains entirely the provider's responsibility. CNC does not reimplement or independently verify provider MFA.
- **Constructive MFA continuation:** If the current tenant's existing policy requires local MFA, the OAuth callback must hand the authenticated user into the existing Constructive MFA challenge and create the final session only after success. Without a local MFA requirement, OAuth success may create the session directly.
- **No implicit business authorization:** User creation does not grant business permissions, tenant roles, schema/API access, or data access. All later authorization remains governed by existing administrator grants and access-control mechanisms.
- **Existing session policy:** OAuth session issuance reuses CNC's existing cookie helpers and tenant auth settings; it must not introduce a separate OAuth session policy.
- **Transient cookie lifecycle:** State and PKCE cookies are short lived, `HttpOnly`, narrowly scoped, and cleared on both callback success and failure. Exact names, lifetime, `SameSite`, secure behavior, and local-HTTP exceptions must follow the frozen shared helper and callback-method contract rather than route-local defaults.
- **Trusted-device scope:** A trusted-device token is excluded from the first rebuild unless the frozen existing MFA/session contract proves it is required; it must not be carried forward solely because the legacy callback exposed it.
- **Safe provider failure surface:** Raw provider error fields and descriptions are never forwarded to the browser. Provider failures map to registered safe errors, with at most a non-sensitive request identifier for correlation.
- **Failure cleanup and replay:** Every failed callback clears transient state, rejects replay, and leaves no partial identity, database, or session work. Retry and audit behavior must preserve those guarantees through the owning public contracts.
- **Logout staging:** Phase one reuses the existing same-origin logout behavior. Parent-domain and cross-host logout and cookie cleanup belong to the later SSO phase and are specified with that phase's host matrix.

## Semantic-Port and Cleanup Rules

Retain:

- Validated security boundaries and redirect validation.
- PKCE and state protections.
- Secure cookie and session behavior.
- Stable public error mapping.
- Scoped routing.
- Real cross-repository OAuth/SSO integration and E2E coverage.

Do not mechanically carry forward:

- Legacy apply/revert commit topology or historical migration choreography.
- Temporary CI workarounds.
- Deprecated CNC DB metadata fallbacks.
- Multi-version runtime compatibility that the frozen baseline no longer requires.

The legacy OAuth/SSO branches and PRs are sources for intended behavior, regression cases, and potentially reusable implementation ideas. Actively extract the capabilities worth retaining, but do not treat their commit history or file layout as the migration unit. The non-target `feat/sso-callbacks` exploration is excluded from this reference set.

## Reuse Priority and Acceptance Criteria

Review legacy behavior and implementation against current CNC public abstractions in this order:

1. CNC Express context and its established request/auth lifecycle.
2. The existing errors library and unified error registry. Required OAuth/SSO errors must be formally defined there and mapped through the common error contract.
3. CNC's 12-factor configuration conventions, including `required`, `devDefault`, and `default` semantics.
4. The layering, discovery, parsing, and validation capabilities already provided by `pgpmjs/env` and `graphql/env`.

For every legacy implementation item, record one disposition before coding:

- **Reuse:** replace it with an existing public abstraction.
- **Extend:** add the missing general capability to the appropriate public library, then consume it from OAuth/SSO.
- **Keep local:** retain a scoped implementation only when it is genuinely domain-specific, with the reason and ownership documented.

Acceptance requires that:

- No legacy implementation is copied directly into the new branch without this review.
- Retained behaviors and regression cases are traceable to their new abstraction or explicitly justified local implementation and corresponding tests.
- Request context, error registration/mapping, configuration parsing, and environment precedence are not duplicated in OAuth/SSO code.
- Any public-library extension is tested at the library boundary before its OAuth/SSO integration tests run.

## Environment and Test Principles

### Confirmed environment ownership

- **`12factor-env` tool layer:** Owns reusable `withDefault`/default, `devDefault`, `required`, parser, and validator behavior. It does not own PostgreSQL, GraphQL, or OAuth business configuration.
- **`pgpm/env` PostgreSQL layer:** Owns only PGPM/PostgreSQL runtime configuration and reuses the 12-factor tools. GraphQL-server-specific OAuth settings must not be added to this layer.
- **`graphql/env` server layer:** Owns GraphQL server and OAuth server-option definitions, merge behavior, and final validation. Middleware consumes only the merged, validated options and must not read `process.env` directly.

### Confirmed `packages/oauth` unit-test boundary

- **Existing harness:** Reuse the package's current Jest/ts-jest unit-test infrastructure. Provider interaction, PKCE, state, token exchange, profile normalization, and other reusable protocol primitives are tested inside `packages/oauth`.
- **Semantic rewrite:** Runtime provider resolution, PKCE/signed-state, and token-auth additions from the legacy branches are not present in the current mainline API, so their test code must not be copied or expected to compile unchanged. Retain the validated behavior and security semantics, then rewrite tests against the frozen baseline API and the confirmed common error-code contract.

### Confirmed database/RLS test scope

- **Available infrastructure:** Use `pgsql-test` for database functions, RLS, and role/tenant context when that layer is in scope.
- **Change-triggered boundary:** Database-level tests are required only when the rebuild adds or changes a database owner's authentication, identity-linking, session procedure, RLS, or role-context contract. Do not add an isolated database test layer solely for OAuth HTTP routes when those contracts are unchanged.

### Confirmed GraphQL server HTTP integration boundary

- **Real integration helper:** Use `graphql-server-test` with its real GraphQL server/database, SuperTest request surface, and existing seed/scoped-routing lifecycle for OAuth/SSO callbacks, redirects, cookies, tenant/API routing, unknown hosts, and no-default-database fallback.
- **Harness ownership:** Test request context, routing, and cookie seams through this real helper. Do not migrate the legacy large custom Express/http plus mocked-context middleware harness as the default approach; keep pure protocol-function unit tests in their owning package.
- **Required options extension:** After the new `graphql/env` OAuth server options are defined, add a small typed forwarding path to `graphql-server-test`. Its types must follow the new validated options contract and must not mechanically restore the legacy `input.oauth` shape.

### Confirmed browser test scope

- **CNC general infrastructure:** `@constructive-io/playwright-test` can start a real server with an isolated database and is the CNC-wide browser facility for navigation, browser cookie policy, UI, and scoped-routing interaction. It is not OAuth/SSO-specific infrastructure.
- **No CNC OAuth/SSO browser layer in this rebuild:** Cover protocol behavior in package unit tests and callbacks, cookie headers, and routing in real server integration tests. Do not add a separate CNC Playwright OAuth/SSO layer for this scope.
- **Hub owns the external browser seam:** Preserve a real browser authorization-code flow against the mock provider boundary, repeat login resolving to the same externally observed account, and parent-domain cookie/shared session working across scoped hosts. Reconsider CNC Playwright separately only if a future CNC-owned browser behavior requires it.
- **Internal assertion ownership:** Hub must not query private `connected_accounts` or other internal database tables. Identity de-duplication, identity-linking procedures, and database-internal invariants belong to their CNC/DB owning test layer; the legacy raw `pg.Pool` private-table assertion is not migrated. This changes test responsibility only, not product-function ownership.

### Confirmed provider mock and fixture boundary

- **Automated provider boundary:** Routine automated tests use a mock OAuth provider rather than a real provider. The mock replaces only authorization, token, and userinfo endpoints; CNC/Hub routing, request context, cookies, database behavior, and sessions remain real wherever the owning test layer supports them.
- **Real-provider limit:** Real providers are restricted to controlled staging or manual smoke checks and are not part of the regular CI path.
- **Fixture-first promotion:** Keep provider simulators and multi-host tooling as local fixtures initially. Promote a narrowly defined public helper only after a second independent, stable scenario reuses it; do not pre-build a general OAuth test framework.
- **Section closure:** These decisions complete the cross-cutting public-practice and test-boundary rules for this rebuild. Scenario-specific cases may still be confirmed within their owning feature discussions.

- Reuse CNC's existing `pgpm/env` and `graphql/env` configuration surfaces. Preserve the 12-factor `required`, `devDefault`, and `default` semantics rather than reading environment variables ad hoc.
- OAuth availability must use an explicit `enabled` switch. When disabled, optional OAuth secrets must not be required; when enabled, all required secrets and provider settings must be validated strictly at startup or configuration load.
- Use the existing appropriate `*-test` libraries for database, GraphQL, server, and browser coverage, including their standard isolation hooks. Do not introduce ad hoc database clients or bespoke test setup.
- Package tests are necessary but not sufficient. The final gate requires a real cross-host browser flow that proves redirect, callback, session propagation, cookie domain/path/security attributes, and logout or failure behavior.

## Non-negotiable Engineering Constraints

- **Environment configuration:** Reuse the appropriate CNC `pgpm/env`, `graphql/env`, and `12factor-env` abstractions. Select `withDefault`, `devDefault`, `required`, and existing parsers/validators according to the value's semantics; do not create parallel ad hoc environment parsing.
- **Test infrastructure:** Start from CNC's existing `*-test` packages, such as `pgsql-test`, `graphile-test`, `graphql-test`, and `graphql-server-test`, choosing the narrowest package that matches the behavior under test. Do not build a duplicate harness when the repository already provides the lifecycle and isolation boundary.
- **Exception semantics:** Never swallow an exception. Every caught failure must either be classified and mapped to a canonical domain/protocol response, or be rethrown while preserving its cause; logging or returning a fallback is not a substitute for failure semantics.

## Commit Freeze Rule

All CNC, CNC DB, Hub, Dashboard, and Functions commit SHAs must be re-checked against their intended refs and frozen when actual development begins. No SHA from a previous discussion or stale session is current fact until that verification is recorded. The implementation record should capture component, source ref, frozen SHA, verification time, and owner.

## Deferred Implementation Confirmations

No further high-level product or security decision is open for the currently documented phase-one OAuth scope. The following evidence-bound details are intentionally resolved against the frozen implementation baseline rather than guessed in advance:

- Freeze the exact CNC, CNC DB, Hub, Dashboard, and Functions refs/SHAs and record approval at implementation start.
- Verify the owning loaders, database procedures, MFA continuation contract, environment parsers, cookie helper behavior, and final registered error-code taxonomy against that baseline.
- Define the exact parent-domain/sibling-host matrix, HTTPS and local-test behavior, route reassignment handling, and cross-host logout/cleanup when the phase-two SSO work begins.
- Record the test and CI evidence required to close the baseline, OAuth, and SSO gates without carrying forward unproven legacy compatibility or workflow changes.

## Next Steps

1. At implementation start, refresh and freeze all component SHAs; do not reuse stale session values.
2. Inventory legacy OAuth/SSO behavior and tests without importing its commit history.
3. Complete the mainline overlap audit and assign CNC/Hub implementation ownership for every browser-flow transition.
4. Establish and validate the Hub latest baseline before any OAuth code is ported.
