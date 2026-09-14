# OAuth/SSO Platform Integration — Constructive DB Detailed Design

## Document Status

This document records the detailed database design and implementation evidence for the Constructive DB runtime. It derives its behavioral requirements from:

- [`docs/sso/plan/oauth-sso-platform-integration.md`](../plan/oauth-sso-platform-integration.md); and
- [`docs/sso/spec/oauth-sso-platform-integration.md`](./oauth-sso-platform-integration.md).

It does not supersede either document. The product requirements define user-visible behavior, and the formal Spec defines the confirmed cross-component design. This document translates those decisions into database responsibilities and delegates repository-local physical choices to the implementing DB PR. No user-facing product/security questions remain in this DB design.

The original Constructive DB evidence was inspected at `origin/main` commit `bd59a523c17e542fbbed3ef3463c720feb29c97c`. Final convergence evidence uses the combined Constructive DB runtime commit `ffc87bb07ede49a0734f676d0eb06042f0565eef`, the seven-PR Constructive stack head `87061435f59a1410b19161c2ae2365cc0891da5d`, and Dashboard implementation commit `a6611fbcab677e91c431f275bd02930b39828421`. Paths under `application/constructive/` are generated evidence only; implementation changes belong in the owning source modules or generators and must regenerate the application output.

### Decision labels

- **Confirmed:** required by the product requirements or formal Spec.
- **Existing:** verified in the Constructive DB baseline above.
- **DB PR decision:** a physical naming, data type, constraint, index, locking, cleanup, or migration choice that does not change confirmed cross-system behavior. The implementing PR resolves it from live repository conventions and evidence; it is not a user-facing open question.

## Scope

This design covers the Constructive DB work needed to support:

- per-Site unified-authentication configuration and exact callback registration;
- short-lived server-side unified login transactions;
- Provider-specific OAuth authorization requests linked to those transactions;
- reuse of existing local-password and external-identity primitives;
- short-lived, one-time Site handoff creation and atomic redemption;
- issuance and validation of a distinct local credential for the target Site;
- Tenant and optional SSO-group isolation;
- trusted Site runtime identity and Site-to-API/service-principal authorization;
- database authorization, retention, cleanup, migration, and test boundaries; and
- the GraphQL operations whose authoritative state transition is owned by PostgreSQL.

## Non-Goals

- Replacing `connected_accounts`, `sign_in_identity`, `sign_up_identity`, existing session storage, or the existing identity-provider configuration model.
- Defining Dashboard UI, Provider adapter HTTP behavior, Cookie headers, browser navigation, or Site frontend storage.
- Implementing cross-parent-domain SSO through a shared Cookie or carrying long-lived credentials in URLs.
- Adding a public login-transaction status, resume, or recovery query. An interrupted v1 flow restarts at the Site login entry.
- Reusing authorization groups or permission scopes as SSO groups.
- Storing Provider authorization codes, Provider tokens, raw Provider responses, password credentials, plaintext handoff codes, or other browser secrets as durable identity data.
- Prescribing unknown physical SQL or GraphQL names before the owning Constructive DB module and deployment topology are confirmed.
- Backward-compatible fallbacks for legacy Tenant, schema, database, secret, callback, or shared-cookie behavior.
- Treating `Origin`, `Referer`, a caller-supplied Site ID, or an API-to-Site reverse lookup as authoritative Site identity.
- Integrating Sites or flows that require Constructive `strictAuth`, local MFA, or step-up authentication. Those policies are not bypassed; support requires a separate future design based on an actual use case.

## Confirmed Database Invariants

1. Tenant is the hard isolation boundary for every Site, unified login transaction, reusable authentication state, Provider OAuth authorization request, handoff, and bound session. Every read, write, consume, redeem, and session-reuse transition must derive Tenant scope from authoritative Site/configuration/transaction context and validate it inside the owning DB function. Cross-Tenant state, handoff, or session reuse is forbidden regardless of physical database topology. When SSO is enabled for a Tenant, the SSO module provisions that Tenant's own prefixed private schema; `sso_private` is the module/template logical name, not one global schema shared by all Tenants. No SSO schema is assumed for a Tenant where the module is not enabled and provisioned.
2. A Site has exactly one logical authentication configuration: `enabled`, `sign_in_mode`, and nullable normalized `sso_group_key`.
3. `sign_in_mode` is `confirm` by default; `silent` is the only other v1 mode.
4. A null `sso_group_key` means the Tenant default SSO group. A non-null key contains only lowercase letters, digits, and hyphens.
5. A Site may register multiple callbacks. Only an active, full, exact callback match is accepted. There are no wildcards, suffix matches, or arbitrary subdomains.
6. If the Site omits a callback at login start, the effective callback is the earliest active registration ordered by `created_at ASC`, then internal ID `ASC`.
7. The technical callback and Site-internal application-relative `returnTo` are distinct values. Both are validated before being bound to server-side transaction context.
8. The unified login transaction is active-flow-only, server-side orchestration state and expires ten minutes after creation. The browser receives only an opaque identifier for current Dashboard-to-Constructive operations.
9. Provider OAuth authorization-request state is separate from the unified login transaction, has a server-side link back to it, and expires ten minutes after creation. The browser and Provider receive only opaque OAuth state, never the unified transaction identifier or PKCE verifier.
10. An SSO handoff is a dedicated minimal logical entity containing only an internal ID, a secure code hash, a login-transaction reference, and creation, expiry, and consumption timestamps.
11. A handoff expires one minute after creation. Plaintext is emitted once, never persisted, and the handoff is marked consumed only as part of successful redemption and Site-local credential issuance.
12. A transient redemption failure before consumption may retry the same handoff during its one-minute lifetime. Replay after successful consumption fails. Redemption additionally requires authoritative Site/runtime context and an exact `site_runtime_clients` tuple; it never introduces an SSO-specific parallel secret or credential system.
13. The browser carries the plaintext handoff as a query parameter on a top-level `GET` navigation to the exact registered Site callback. The handoff contains no identity, session, or long-lived credential; raw `returnTo` and unified transaction state remain server-side.
14. External identity association remains owned by `connected_accounts`, keyed by Provider `service` plus stable external `identifier`, never email or an authorization code.
15. `sign_in_identity` and `sign_up_identity` remain unchanged general Tenant **external-identity** authentication primitives. SSO-specific validation and orchestration belong in wrappers or coordinating functions.
16. Every successful authentication method converges on the same handoff and Site-local credential path.
17. Caught database errors are either mapped to a registered stable domain error or rethrown with their cause preserved. Logging or fallback behavior does not replace failure semantics.
18. Site/browser correlation uses a Site-generated, cryptographically random, short-lived, one-time `site_state`. The Site keeps its expected value in a process-independent first-party session boundary; the unified transaction binds the public value and returns it beside the handoff. It does not replace handoff validation, Tenant isolation, or target Site/runtime authentication.
19. `site_id` is a first-class trusted runtime security fact. Site-originated redemption, Site credential issuance, and later Site-session authentication must receive authoritative `(site_id, api_id, principal_id)` context from the routing/runtime-authentication boundary and validate the complete tuple in PostgreSQL. `site_id` is never inferred from `api_id`; multiple Sites may intentionally share one API.
20. The logical `site_runtime_clients` relation defines which exact API/service-principal pairs may act for each Site. Possession of a handoff, an otherwise valid API key, or a matching API alone is insufficient. `Origin` and `Referer` may support defense-in-depth checks but never establish Site identity or replace the tuple authorization.

## Existing Owners and Reuse

| Capability | Verified current owner | Reuse decision | Evidence |
| --- | --- | --- | --- |
| Site identity and Tenant/database association | **Existing:** `catalog_private.sites`, including `id`, `database_id`, `created_at`, and `updated_at` | Extend around the existing Site; do not create a parallel Site registry | `platform-schema/catalog/deploy/schemas/catalog_private/tables/sites/` |
| API, Site, and service-principal runtime facts | **Implemented in the final Constructive stack:** canonical routing resolves `runtime_site_id`, Express Context carries it as `siteId`, and pgSettings forwards `site_id` beside `api_id` and `principal_id` | Preserve the complete trusted tuple; never infer Site from API or accept it from GraphQL input | `graphql/server/src/middleware/routing.ts`, `packages/express-context/src/context.ts`, `packages/express-context/src/pg-settings.ts`, and `graphql/server/src/auth/sso/service.ts` |
| Site administration authorization | **Existing:** RLS policies on `catalog_private.sites` based on Constructive membership permissions | Reuse the current permission model for Site-auth configuration administration; the DB PR selects the exact predicates from the live permission registry | `platform-schema/catalog-security/deploy/schemas/catalog_private/tables/sites/policies/` |
| Tenant Provider configuration | **Existing:** generated `identity_providers_module`; the current Constructive relation includes enabled status, endpoints, scopes, client identifier, secret reference, PKCE setting, OIDC metadata, and policy flags | Reuse; no SSO-only Provider registry or secret store | `packages/metaschema-generators/.../identity_providers_module.sql` and generated `constructive_auth_private.identity_providers` |
| Provider secret storage | **Existing:** identity-provider rows refer to the existing internal-secrets capability | Reuse its ownership, resolution, rotation, and access boundary | `identity_providers_module` plus `internal_secrets_module` |
| External identity association | **Existing:** `constructive_user_identifiers_private.connected_accounts` with unique `(service, identifier)`, `owner_id`, `details`, and verification state | Reuse unchanged as the durable Provider-to-user mapping | generated relation and `connected_accounts_module` |
| Tenant-local external-identity sign-in | **Existing:** generated `sign_in_identity` accepts Provider `service` + stable `identifier`, validates the enabled Provider, finds `connected_accounts`, applies account and rate-limit policy, and creates a session credential | Call unchanged through external-identity SSO orchestration | `packages/ast-actions/.../sign_in_identity.sql` and generated procedure |
| Tenant-local external-identity sign-up | **Existing:** generated `sign_up_identity` accepts Provider identity data and provisions the user, email, connected account, and session credential | Call unchanged for an unlinked Provider identity whose email is unowned | `packages/ast-actions/.../sign_up_identity.sql` and generated procedure |
| Local password sign-in and registration | **Existing:** generated `constructive_auth_public.sign_in(email, password, ...)` and `sign_up(...)`; password recovery/reset functions also exist | Reuse unchanged behind transaction-aware SSO wrappers where continuation is required | generated `constructive_auth_public` procedures |
| Sessions and credentials | **Existing:** `sessions_module`, including `sessions` and `session_credentials` | Reuse credential issuance and validation primitives; add the required central-to-Site revocation binding in the correct session/SSO owner | `packages/metaschema-generators/.../sessions_module.sql` and generated tables |
| Provider OAuth authorization request | **Existing:** `integrations/sso/sql` owns the logical-template `sso_private.oauth_authorization_requests` with opaque state, server-held verifier/nonce, expiry, consumption, and purge functions | **Confirmed:** evolve/reuse each enabled Tenant's provisioned instance and add its unified-login-transaction association. Legacy `lane` is not used; `returnTo` remains only on the unified transaction | `integrations/sso/sql/deploy/schemas/sso_private/` |
| Pending identity-link ticket | **Existing:** `sso_private.pending_identity_links` supports a post-verification account-linking flow | Do not use for unified pre-login transactions or v1 email-conflict handling | `integrations/sso/sql/deploy/schemas/sso_private/tables/pending_identity_links/` |
| Database test infrastructure | **Existing:** the repository depends on `pgsql-test`; the SSO integration also has a Jest/ts-jest flow against a provisioned database and emulated Provider | Reuse the owning DB test infrastructure; mock only the external Provider boundary in higher-layer flow tests | root `package.json` and `integrations/sso/__tests__/` |

References to `sso_private` in the existing integration evidence identify the SSO module's logical/template schema. Runtime functions must resolve the current enabled Tenant's provisioned, Tenant-prefixed private SSO schema through the authoritative module/context path. They must not hardcode a global `sso_private` schema, query another Tenant's provisioned schema, or fall back when the current Tenant has no provisioned SSO module.

### Verified authentication primitive mapping

The formal Spec and verified Constructive DB contracts use the same primitive mapping. `sign_in_identity` does not accept a username/password: it accepts external identity `service`, `identifier`, optional Provider `details`/`email`, and credential options. The local password primitive is `constructive_auth_public.sign_in(email, password, ...)`.

The confirmed mapping is:

- local password wrapper → unchanged Tenant-local `sign_in`;
- local registration wrapper → unchanged Tenant-local `sign_up`;
- returning external Provider identity → unchanged `sign_in_identity`; and
- first-time external Provider identity → unchanged `sign_up_identity`.

Adding password parameters or SSO transaction concerns to `sign_in_identity` is not an acceptable compatibility workaround.

## Logical-to-Physical Inventory

| Logical capability | Confirmed logical owner | Current physical object | DB PR action | Physical decision status |
| --- | --- | --- | --- | --- |
| Site authentication configuration | Existing Site (**Confirmed**) | None verified | Add the confirmed one-to-one Site-owned model | Physical placement, naming, and migration mechanics are DB PR decisions |
| Exact Site callbacks | Existing Site (**Confirmed**) | None verified for unified-auth callbacks | Add the confirmed one-to-many Site-owned model | Physical placement, naming, and migration mechanics are DB PR decisions |
| Site runtime client authorization | Existing Site/runtime-auth boundary (**Confirmed**) | No exact Site/API/principal relation verified | Add the logical `site_runtime_clients` relation and validate exact `(site_id, api_id, principal_id)` tuples | Logical authorization is confirmed; physical placement and identifiers are DB PR decisions |
| Unified login transaction | Constructive SSO | None | Add a dedicated short-lived model inside each enabled Tenant's provisioned private SSO schema | Per-Tenant ownership is confirmed; representation is a DB PR decision |
| Provider OAuth authorization request | Constructive SSO Provider subflow | Logical template relation `sso_private.oauth_authorization_requests` exists | **Confirmed:** evolve/reuse the Tenant-local table and link each Provider request to its Tenant-local unified transaction | Legacy column/data migration timing is a DB PR decision |
| External identity association | Connected-accounts module | `constructive_user_identifiers_private.connected_accounts` | Reuse unchanged | **Confirmed reuse** |
| Local password authentication/registration | User-auth module | `sign_in`, `sign_up` | Reuse unchanged behind transaction-aware SSO coordination | **Confirmed reuse** |
| External identity authentication/provisioning | User-auth and connected-accounts modules | `sign_in_identity`, `sign_up_identity` | Reuse unchanged behind SSO-specific coordination | **Confirmed reuse** |
| SSO handoff | Constructive SSO | None | Add a dedicated minimal one-time artifact inside each enabled Tenant's provisioned private SSO schema | Logical shape and per-Tenant ownership are confirmed; representation is a DB PR decision |
| Authentication-center session | Sessions module | `sessions`, `session_credentials` | Reuse current credential outcome | Classification/tagging is a DB PR decision |
| Site-local session bound to unified session | Sessions/SSO boundary | No verified parent/unified-session link exists in current `sessions` columns | Add an explicit binding in the correct sessions/SSO owner so each protected request can reject a revoked unified session | Physical model and topology integration are DB PR decisions |
| Expired-artifact cleanup | Constructive SSO | Legacy OAuth purge function exists | Reuse the expiry/purge pattern for all new transient entities | Scheduler, retention grace, and function names are DB PR decisions |

## Persistence Models and DB PR Choices

The following sections specify confirmed logical columns and constraints. Unless an existing physical object is named explicitly, the implementing DB PR selects SQL identifiers and data types from current repository conventions; those choices are not product decisions.

### Site Authentication Configuration

**Logical owner and cardinality:** **Confirmed.** This is a Site-owned one-to-one model anchored to the existing Site. It is not a parallel Site registry and cannot be owned independently by a Tenant auth row.

**Physical implementation:** the DB PR selects the source module, schema, table, and column names from live repository conventions. That implementation choice does not reopen logical ownership or cardinality.

| Logical column | Requirement | Status |
| --- | --- | --- |
| Site reference | References exactly one existing Site | **Confirmed**; FK target/type is a DB PR decision |
| `enabled` | Controls whether the Site may start unified authentication | **Confirmed** |
| `sign_in_mode` | `confirm` by default; `silent` is the alternative | **Confirmed** |
| `sso_group_key` | Nullable lowercase key; null means Tenant default group | **Confirmed** |

Required constraints and behavior:

- One configuration per Site, enforced by the physical Site relationship (**Confirmed cardinality**).
- `sign_in_mode` accepts only `confirm` and `silent` (**Confirmed**).
- A non-null `sso_group_key` matches `^[a-z0-9-]+$` and is stored in normalized lowercase form (**Confirmed**).
- Tenant is derived from the owning Site and cannot be supplied independently to create a cross-Tenant association (**Confirmed**).
- Backfill behavior for pre-existing Sites and cascade/cleanup mechanics are implementation-time migration decisions. They do not change the confirmed one-to-one Site ownership.

Lifecycle: created and updated only through permission-controlled Tenant administration. Disabling prevents new starts; the Site configuration is revalidated before handoff creation or redemption so a flow cannot complete under stale trust.

### Site Callback Address

**Logical owner and cardinality:** **Confirmed.** Callback registrations are Site-owned one-to-many children of the existing Site.

**Physical implementation:** the DB PR selects the source module, schema, table, and column names from live repository conventions. That implementation choice does not reopen logical ownership or cardinality.

| Logical column | Requirement | Status |
| --- | --- | --- |
| Internal ID | Stable deterministic tie-breaker for default callback selection | **Confirmed behavior**; type/name is a DB PR decision |
| Site reference | Owning Site | **Confirmed** |
| Exact callback URL | Full registered technical callback | **Confirmed** |
| Active/allowed status | Only active callbacks may start or complete a flow | **Confirmed** |
| `created_at` | Primary ordering key for default callback selection | **Confirmed behavior** |

Required constraints and behavior:

- Explicit callback input matches the stored full URL exactly; no wildcard, suffix, parent-domain, similar-host, or arbitrary-subdomain matching (**Confirmed**).
- Omitted callback selects one active row ordered by `created_at ASC`, then internal ID `ASC` (**Confirmed**).
- A Site with no active callback cannot start unified login (**Confirmed consequence**).
- Each registration stores one full callback URL and its own active/allowed state; exact comparison uses the validated stored value (**Confirmed**).
- Tenant is derived through the Site reference and must be checked on every lookup (**Confirmed**).

Lifecycle: administrators add, activate, deactivate, or remove callbacks. A removed or disabled callback invalidates an in-flight flow at the required final revalidation boundary. The DB must not infer or backfill callbacks from CORS configuration, current Host headers, routing suffixes, or legacy redirect values.

### Site Runtime Client Authorization

**Logical owner:** **Confirmed.** `site_runtime_clients` is the Site/runtime-authentication authorization relation. It is distinct from Site callbacks, CORS/origin configuration, Tenant membership, API routing, and SSO groups.

Each row authorizes one exact tuple:

| Logical column | Requirement | Status |
| --- | --- | --- |
| Site reference | The Site whose runtime is being authenticated | **Confirmed** |
| API reference | An API this Site may use; the same API may be referenced by multiple Sites | **Confirmed** |
| Service-principal reference | The authenticated runtime principal allowed to act for that Site through that API | **Confirmed** |

The exact `(site_id, api_id, principal_id)` tuple is unique. There is no wildcard Site, API, or principal authorization in v1. The DB PR selects the owning source module, physical schema/table name, key types, foreign-key targets, and administration surface from live repository conventions; those choices do not reopen the tuple security model.

Lifecycle: an authorized administrator creates or removes mappings. Removing a mapping must make later handoff redemption, Site credential issuance, and protected Site authentication fail closed for that tuple. Existing Sites receive no inferred mapping from their API, domain, callback, `Origin`, or `Referer`; rollout provisions explicit mappings before enabling unified authentication.

### Unified Login Transaction

**Schema ownership:** **Confirmed.** This is a dedicated model in the current enabled Tenant's provisioned, Tenant-prefixed private SSO schema. The DB PR selects its physical table/column names. It must not overload the Provider-specific OAuth request or pending identity-link ticket.

| Logical column or binding | Requirement | Status |
| --- | --- | --- |
| Internal ID | Private row identity | **Confirmed logical need**; type/name is a DB PR decision |
| Opaque active-flow identifier | Value Dashboard returns only to Constructive during the active flow | **Confirmed**; at-rest representation is a DB PR security choice |
| Tenant reference | Hard isolation boundary | **Confirmed**; physical source/FK is a DB PR decision |
| Site reference | Validated initiating/target Site | **Confirmed** |
| Callback binding | Validated exact callback, by reference and/or immutable snapshot | **Confirmed binding**; representation is a DB PR decision |
| `returnTo` binding | Validated Site-internal application-relative target | **Confirmed**; representation is a DB PR decision |
| Authentication-center browser binding | Binds Dashboard operations to the authentication center's current first-party session/request context | **Confirmed behavior**; storage details are a DB PR decision |
| Site `site_state` binding | Returns the Site-created one-time public correlation value at the exact callback so the Site can match the initiating browser before redemption | **Confirmed behavior**; representation is a DB PR decision |
| Effective SSO group | Tenant default group or normalized Site group used for reuse decisions | **Confirmed behavior**; derive/store strategy is a DB PR decision |
| Sign-in decision context | Site mode and authenticated-state decision used by the active flow | **Confirmed behavior**; snapshot strategy is a DB PR decision and cannot replace final live revalidation |
| Authenticated identity/session outcome | Server-side association after reused auth, password, or Provider success | **Confirmed behavior**; physical reference is a DB PR decision |
| Creation and expiry | Expires ten minutes after creation | **Confirmed** |
| Completion/consumption state | Prevents reuse and represents terminal success/failure | **Confirmed lifecycle**; timestamp/state representation is a DB PR decision |

Required constraints and behavior:

- The opaque identifier is unique, unguessable, and never treated as an identity or long-lived credential (**Confirmed**).
- Site, callback, Tenant, group, authentication-center browser binding, Site `site_state`, and `returnTo` cannot be replaced by later browser input (**Confirmed**).
- The Site, callback, and applicable SSO boundary are revalidated before issuing a handoff (**Confirmed**).
- Only one authenticated identity outcome may be associated with a transaction (**Confirmed consequence of the single shared post-authentication continuation**).
- No public table grant or public GraphQL row query exposes transaction state (**Confirmed**).
- Private callback lists, group data, raw `returnTo`, browser-binding material, and identity outcome are not returned by the start operation. It returns only the opaque identifier and safe display/decision context (**Confirmed**).

Lifecycle: start creates an active row; local password, existing unified auth, or a Provider callback may associate one authenticated outcome; shared completion creates a handoff and terminates the active orchestration path. Expired, interrupted, invalid, or failed Provider flows are not resumed. The DB PR selects the terminal-state representation and bounded audit retention without changing those semantics.

### Provider OAuth Authorization Request

**Confirmed physical evolution:** evolve/reuse the logical-template relation `sso_private.oauth_authorization_requests` in each enabled Tenant's provisioned, Tenant-prefixed private SSO schema. It already stores `provider_slug`, opaque `state`, server-side `code_verifier`, optional `nonce`, `redirect_uri`, timestamps, and a consumed marker; the new design adds the association to that Tenant's unified login transaction. It is not a shared global schema.

The legacy `lane` column has no replacement and is not used by the new flow. The legacy `return_to` column is also not used: validated Site-internal `returnTo` is owned and stored only by the unified login transaction. The deploy/drop/compatibility timing for legacy columns and in-flight legacy rows remains an implementation-time migration decision.

The new logical record requires:

| Logical column or binding | Requirement | Status |
| --- | --- | --- |
| Internal ID | Private request identity | **Existing** in the candidate table |
| Unified login transaction reference | Restores the original transaction server-side | **Confirmed new requirement** |
| Configured Provider reference/key | Binds start and callback to the same enabled Tenant Provider | **Confirmed**; key versus FK is a DB PR decision |
| Opaque random OAuth state | Browser/Provider correlation only | **Confirmed**; at-rest representation is a DB PR security choice |
| PKCE verifier | High-entropy server-side verifier; never browser/URL/log | **Confirmed** |
| OIDC nonce | Server-side when required by the selected Provider adapter | **Confirmed conditional behavior** |
| Provider redirect URI | Exact URI used at authorization and code exchange | **Confirmed behavior** |
| Creation, expiry, consumption | Expires ten minutes after creation and is consumed once | **Confirmed** |

Required constraints and behavior:

- OAuth state is unique, cryptographically random, expires, and is consumed atomically before Provider error or code handling (**Confirmed**).
- The Provider, OAuth request, and unified transaction must all belong to the same Tenant/database boundary (**Confirmed**).
- `returnTo`, Site callback, and SSO group remain owned by the unified transaction, not duplicated into the Provider request (**Confirmed ownership**). In particular, the evolved OAuth request table does not write or read its legacy `return_to` column for the new flow.
- Provider tokens and authorization codes are not persisted in this relation (**Confirmed**).
- The current legacy `lane` distinction is not part of the new platform design, has no replacement, and must not leak into the evolved flow (**Confirmed architectural exclusion**).
- Reuse/evolution of the existing per-Tenant table is **Confirmed**. The PR must still determine legacy column cleanup and compatibility timing after verifying whether the old integration is installed anywhere with in-flight rows.

Lifecycle: Provider start persists state, verifier, nonce, redirect, Provider, and unified-transaction association before redirect. Callback locks and consumes the matching unexpired request exactly once, restores server-held context, then performs Provider exchange outside the database. A failed Provider exchange does not reactivate or resume the consumed request; the user restarts from Site login.

### SSO Handoff

**Schema ownership:** **Confirmed.** The dedicated handoff belongs in the current enabled Tenant's provisioned, Tenant-prefixed private SSO schema. The DB PR selects physical table/column names. Do not store a handoff in Provider OAuth state, `session_credentials`, or a browser session.

| Logical column | Requirement | Status |
| --- | --- | --- |
| Internal ID | Private row identity | **Confirmed**; type/name is a DB PR decision |
| Secure code hash | Unique lookup material; plaintext is never stored | **Confirmed**; approved hash algorithm/encoding is a DB PR security choice |
| Unified login transaction reference | The sole reference to Tenant, group, Site, callback, identity, and `returnTo` context | **Confirmed** |
| `created_at` | Creation time | **Confirmed** |
| `expires_at` | Exactly one minute after creation | **Confirmed** |
| `consumed_at` | Null until successful redemption and Site credential issuance | **Confirmed** |

Required constraints and behavior:

- The handoff does not duplicate Tenant, group, target Site, callback, identity, or `returnTo` columns (**Confirmed**).
- Code hash is unique and indexed; plaintext is returned once to the common service and never logged or persisted (**Confirmed behavior**).
- A completed transaction has at most one active handoff. A transient redemption failure may retry that same unconsumed code within its one-minute lifetime; v1 does not mint a replacement handoff for the same transaction (**Confirmed consequence of the one-time shared completion flow**).
- Redemption verifies the unexpired, unconsumed handoff and its referenced transaction, then revalidates the Tenant, target Site, callback, and SSO boundary (**Confirmed**).
- The row is marked consumed only after Site-local credential issuance succeeds in the same database transaction (**Confirmed atomicity**).
- Locking must make concurrent redemption attempts deterministic: exactly one can succeed; all later attempts receive a stable already-used failure (**Confirmed outcome; locking implementation is a DB PR decision**).

Lifecycle: create after a successful authentication path and final target revalidation; carry the plaintext code as a query parameter on a top-level browser `GET` to the exact callback; redeem server-to-server; consume on successful issuance; purge after expiry plus a bounded operational grace period selected by the DB PR. Cleanup retention never extends redeemability beyond one minute.

### Session and Unified-Session Binding

The current generated `sessions` table has session identity, expiry, revocation, origin, authentication-method, and security timestamps, but no verified parent/unified-session or Site reference. Product requirements state that a Site-local session is bound to the current-browser unified session and must become unusable after that unified session is revoked.

This capability is **Confirmed**. The DB PR must implement it in the correct sessions/SSO owner, either by extending the current session model or through a dedicated private relation, following current repository ownership and deployment topology. That physical choice is not user-facing and must preserve:

- distinct authentication-center and Site credentials;
- no cross-parent-domain Cookie sharing;
- same-Tenant and effective-group validation;
- revocation checks on every protected Site request;
- no cross-Tenant session link;
- indexable lookup without exposing central session identifiers to the browser; and
- an atomic Site-credential issue path during handoff redemption.

The DB PR cannot be considered complete until it implements and verifies this binding for the deployment topology in scope.

## PostgreSQL Function Design

All names below are logical operation names. The DB PR selects exact Tenant-prefix naming, SQL function names, argument and return types, volatility, execution roles, and generated GraphQL exposure from current repository conventions. The schema owner is fixed: SSO functions operate on the current enabled Tenant's provisioned private SSO schema. They must resolve that schema through the authoritative Tenant/module context, never hardcode a global `sso_private`, never read or write another Tenant's schema, and fail explicitly when SSO is not provisioned for the current Tenant. Implementations must use the canonical `errors.raise_error` system, repository security conventions, explicit Tenant scoping, and transaction-safe locking. They must not catch and discard failures.

| Logical DB operation | Purpose and logical input | Logical output | Atomicity and failure boundary |
| --- | --- | --- | --- |
| Start unified login | Tenant/request context, untrusted Site ID, optional callback, validated-candidate `returnTo`, authentication-center browser binding, and Site-created `site_state` | New opaque transaction identifier plus safe Site/config context; Provider display options are merged by Constructive from the existing loader | In one transaction: resolve Site/Tenant; require enabled config; exact-match or deterministically select callback; validate `returnTo` and `site_state`; persist all bindings. No row is created on any validation failure. |
| Confirm existing unified identity | Active transaction ID plus current authentication-center session/identity context | Authenticated transaction ready for shared completion | Lock transaction; validate active/expiry/browser/Tenant/group/Site mode; associate the existing identity once. Reject mismatched or already-completed rows. |
| SSO local-password wrapper | Active transaction ID plus local credentials and existing credential options | The unchanged local `sign_in` credential result plus minimal continuation state | Lock/validate transaction and SSO boundaries; invoke the existing local-password primitive exactly once; on success associate its identity/session outcome. Password failure preserves the existing safe error and leaves an unexpired active transaction available for manual resubmission; there is no automatic retry. |
| SSO local-registration wrapper | Active transaction ID plus the existing local-registration input | The unchanged local `sign_up` credential result plus minimal continuation state | Validate transaction and boundaries, call existing registration once, associate the new authenticated identity/session, and enter common completion atomically where the existing procedure contract permits. The DB PR selects the narrow wrapper composition without extending `sign_up` with SSO concerns. |
| Create Provider OAuth request | Active transaction ID, selected enabled Provider, Constructive-server-generated random state, PKCE verifier, optional nonce, and exact Provider redirect URI | Private OAuth request ID; opaque OAuth state remains with the service for browser navigation | Validate transaction/Provider/Tenant before insert, persist the unified-transaction link before redirect, and enforce the confirmed ten-minute expiry. Constructive generates the cryptographic values through the owning OAuth package; only state, challenge, and protocol-required public inputs cross the browser boundary. |
| Read Provider OAuth request for authorization | OAuth state and current authorization-route context | Provider key, verifier/challenge inputs, optional nonce, redirect URI, and linked transaction facts needed by Constructive | Resolve only inside the current Tenant schema; require exact current route/Tenant, active transaction, matching enabled Provider, unexpired request, and unused state. This read does not consume state. A repeated authorize navigation may reread the same active row, but only callback consumption can win once. |
| Consume Provider OAuth request | Callback OAuth state and current callback route context | Provider key/config reference, verifier, nonce, redirect URI, and unified transaction reference | Lock by state; follow the linked transaction; require the same authoritative Tenant/route, exact match, unexpired, and unused; stamp consumption before any Provider error/code handling. Invalid, expired, replayed, cross-Tenant, or mismatched state raises a stable safe error. |
| Apply normalized external identity | Active transaction plus normalized `service`, stable `identifier`, optional email, and safe details | Existing or newly provisioned local identity and authentication-center credential outcome | In one transaction: resolve `(service, identifier)`; existing association uses unchanged `sign_in_identity`; unlinked/unowned email uses unchanged `sign_up_identity`; email owned by another account raises explicit conflict. Unique email and connected-account constraints must arbitrate concurrency. The DB PR selects the narrow wrapper composition without changing the general identity primitives. |
| Create SSO handoff | Authenticated transaction plus a Constructive-server-generated secure code hash | Handoff creation result and expiry; the service emits its plaintext exactly once | Lock transaction; revalidate its authoritative Tenant/Site/callback/group; insert only the secure hash and confirmed minimal fields; enforce one-minute expiry. Plaintext generation and hashing use Constructive's owning service and never enter durable storage. |
| Authorize Site runtime | Authoritative `site_id`, `api_id`, and `principal_id` from request pgSettings/runtime context | Authorized Site/runtime tuple or one safe authorization failure | Require an exact `site_runtime_clients` match inside the current Tenant/database boundary. Never derive Site from API, caller input, `Origin`, or `Referer`. This check is a reusable internal boundary for redemption, issuance, and later Site authentication, not a public discovery API. |
| Redeem SSO handoff | Constructive-server-computed code hash plus authoritative `site_id`, `api_id`, and `principal_id` request context | Distinct Site-local credential result and verified Site-internal `returnTo` | Lock the candidate row by hash; follow its transaction; require the transaction Site to equal runtime `site_id`; require the exact runtime tuple through `site_runtime_clients`; validate Tenant, callback, group, unified session, expiry, and unused state; issue the Site-local credential; stamp `consumed_at` only after issuance succeeds. The whole success path commits or rolls back together. |
| Validate Site-local session | Current Site credential plus authoritative `site_id`, `api_id`, and `principal_id` request context | Principal/session facts or a classified invalid/revoked result | On every protected request, require an exact authorized runtime tuple and require the Site, Site-local session, and bound unified session to share the same Tenant, then validate local expiry/revocation. A valid credential presented through another Site, API, or principal fails closed. |
| Purge transient SSO state | Operational retention cutoff(s) | Deleted-row counts per entity | Delete only artifacts no longer redeemable, respecting operational/audit grace. Cleanup failure is observable and retryable; it never extends authentication validity. |

### Existing Function Contracts That Must Remain Unchanged

- `sign_in(email, password, remember_me, credential_kind, csrf_token, ...)` remains the Tenant-local password sign-in primitive. The generated implementation already verifies password and policy, applies rate limiting/audit behavior, and issues a session credential.
- `sign_up(...)` remains the Tenant-local password registration primitive. Its current contract must be inspected and reused unchanged when the registration continuation wrapper is finalized.
- `sign_in_identity(service, identifier, details, email, credential_kind, remember_me, ...)` remains the Tenant-local external-identity sign-in primitive. The generated implementation already resolves `connected_accounts`, checks Provider enablement and account policy, applies rate limiting/audit behavior, and issues a session credential.
- `sign_up_identity(service, identifier, email, details, credential_kind, remember_me, ...)` remains the Tenant-local external-identity provisioning primitive. The generated implementation already provisions the user/email, inserts the connected-account association, and issues a session credential.
- The new SSO wrappers must discover the Tenant-specific physical procedure locations through the existing Constructive request-context/auth-surface mechanism. They must not hardcode generated schema names or add `loginTransactionId`/Site arguments to the general procedures.
- Existing safe error semantics and reason chains are preserved. The wrappers add only stable SSO-domain errors needed for transaction, callback, group, handoff, and account-conflict boundaries.

## GraphQL and HTTP Interface Mapping

Names in this section describe logical operations. The DB PR selects exact GraphQL field names, input/payload types, and generated annotations according to current repository conventions.

| Interface | Caller | Authentication/authorization | DB responsibility |
| --- | --- | --- | --- |
| Site auth public discovery query | Dashboard before or around start | Public but Tenant/Site scoped; returns only enabled public branding/mode/provider-display facts | May reuse the same authoritative Site/callback validation logic, but is advisory and cannot replace start validation. Never returns secrets, callback lists, group internals, or redeemable data. |
| Start unified login mutation | Dashboard, before local authentication | Anonymous/public entry with current Tenant route context; Site/callback are untrusted inputs | Calls the start function and returns opaque transaction ID plus safe context. Provider display options come from enabled Tenant Provider configuration. |
| Confirm current account mutation | Authenticated Dashboard user | Valid auth-center Bearer/Cookie plus active transaction/browser binding | Calls the confirm-existing-identity function, then shared handoff continuation. |
| Unified local-password mutation | Dashboard | Anonymous active transaction plus credentials; existing rate limits apply | Calls the SSO password wrapper; returns the normal Dashboard-local credential outcome and only minimal SSO continuation information. |
| Unified local-registration mutation | Dashboard | Anonymous active transaction plus existing registration inputs; existing registration policy/rate limits apply | Calls the SSO registration wrapper; successful registration immediately establishes auth-center state and enters shared completion. |
| Password recovery/reset operations | Dashboard | Existing public recovery proof and policy | Reuse existing operations. Completing recovery does not resume the old unified transaction; v1 restarts at the Site login entry, consistent with the active-flow-only rule. |
| Provider discovery query | Dashboard | Tenant-scoped public read | Returns enabled safe Provider display options only; legacy `/auth/providers` is not restored. |
| Start Provider authentication mutation | Dashboard | Active unified transaction, selected Provider, and current Tenant request context | Creates the linked OAuth request with Constructive-generated state/verifier/nonce, then returns only the opaque state or same-origin authorization-initiation continuation needed by Constructive. |
| Provider authorization initiation | Browser HTTP operation coordinated by Constructive | Opaque OAuth state plus current Tenant route/context; no unified transaction ID | Reads and revalidates the already persisted linked OAuth request without consuming it, then redirects to the configured Provider. This remains HTTP because redirect semantics are not replaceable by GraphQL. |
| Provider callback | Browser HTTP callback to Constructive | Opaque OAuth state plus Provider code/error; no unified transaction ID | Atomically consumes OAuth state, restores transaction/Provider, and passes the normalized identity to DB identity orchestration. |
| Redeem Site handoff mutation | Target Site server | Handoff proof plus authoritative runtime `site_id`, `api_id`, and `principal_id`; the complete tuple must be registered for the Site | Calls the atomic redemption function and returns only the distinct Site-local credential result plus verified `returnTo`. Site identity is supplied by trusted routing/runtime authentication, never by mutation input or API reverse lookup. |
| Site auth configuration/callback administration | Authorized Tenant administrator | Existing membership/permission model; the DB PR selects exact permission bits/scopes from the live registry | CRUD through the correct owner with RLS and audit behavior. Full callback lists are administrative, not public discovery data. |
| Login transaction status/recovery query | No caller | Not exposed | **Explicitly absent in v1.** |

The Site callback itself remains an exact registered browser `GET` destination. Its query carries the opaque one-time handoff code and transaction-bound public `site_state`, but no identity, session credential, long-lived token, raw `returnTo`, or unified transaction state. Before redemption, the Site matches `site_state` against the same browser's process-independent pending-login state; the Site consumes that local state after successful redemption. Constructive cannot set a Cookie for the Site's parent domain; after server-side redemption, the Site response owns its first-party Cookie and frontend Bearer-storage behavior and immediately redirects to the verified clean `returnTo`.

## Operation-to-Storage Mapping

| Flow step | Read | Write/function | Notes |
| --- | --- | --- | --- |
| Site starts login | Existing Site, Site auth config, active callbacks | Start-login function inserts unified transaction | Explicit callback exact-matches; absent callback uses deterministic order. |
| Start response composition | Site public config, effective mode/group, enabled identity providers, current auth-center session | No additional public transaction read | Constructive returns safe context only. |
| Silent reuse | Transaction, current unified session, effective group | Confirm/reuse function associates identity outcome | Cross-Tenant or cross-group reuse fails. |
| Confirm-before-sign-in | Same as silent plus explicit user action | Confirm/reuse function | Same authenticated outcome as silent after confirmation. |
| Local password | Transaction | SSO password wrapper calls unchanged local `sign_in` | One call per user submission; no automatic retry. |
| Local registration | Transaction | SSO registration wrapper calls unchanged local `sign_up` | Successful registration establishes auth-center state and enters the shared completion path. |
| Provider start | Transaction, enabled Provider config | Create linked OAuth request | State, verifier, and nonce persist server-side before redirect. |
| Provider authorization redirect | OAuth request by state, current Tenant route, enabled Provider config | Read active OAuth request without consuming it | Repeated browser navigation may repeat the Provider redirect; callback state consumption still has exactly one winner. |
| Provider callback | OAuth request by state, linked transaction | Consume OAuth request | Consume before Provider code exchange/error handling. |
| Existing Provider identity | `connected_accounts(service, identifier)` | Unchanged `sign_in_identity` through SSO orchestration | Stable Provider identifier is authoritative. |
| New Provider identity | Connected accounts plus email ownership | Unchanged `sign_up_identity` through SSO orchestration | Only when email is unowned; no automatic merge/link. |
| Shared post-auth completion | Authenticated transaction plus live Site/callback/group config | Create handoff | All successful methods converge here. |
| Browser callback delivery | No private DB read in browser | No DB write | Constructive issues `303` after Provider success; Dashboard-mediated successes perform the equivalent top-level `GET`. The exact callback query carries the plaintext one-time code and public `site_state`, but no identity or reusable credential. |
| Site redemption | Handoff hash, referenced transaction, session state, exact runtime tuple | Redeem function authorizes `(site_id, api_id, principal_id)`, issues Site credential, and consumes handoff | One atomic success; Site must equal the transaction Site, and retry is allowed only before consumption and before one-minute expiry. |
| Protected Site request | Site session/credential, exact runtime tuple, and unified-session binding | Session validation/touch behavior as owned by current auth system | The exact runtime tuple remains authorized; unified revocation or mapping removal invalidates the Site-local session. |
| Logout/switch account | Current-browser unified session and its Site bindings | Revoke the current unified session and make all of its bound Site sessions unusable | Current-browser scope only; no Site notification callback and no “all devices” feature. |
| Cleanup | Expired transaction, OAuth request, and handoff rows | Purge functions or existing scheduler integration | The DB PR selects cadence, bounded batches, and post-expiry operational retention. |

## Authorization and RLS

### Tenant isolation enforcement

- Tenant isolation is a **hard invariant**, not an implementation option. Unified login transactions, Provider OAuth authorization requests, SSO handoffs, and bound sessions can be created, read, changed, consumed, redeemed, or reused only within their authoritative Tenant.
- Start derives Tenant from the validated Site and Site-owned authentication configuration. Later operations derive it from the already-bound unified transaction and revalidate it against the current authoritative Site/request context; callers cannot replace it with a Tenant input.
- A Provider OAuth request must reference a unified transaction in the same Tenant. State consumption restores that relationship server-side and rejects a callback whose current route/context resolves to another Tenant.
- A handoff references its unified transaction rather than duplicating Tenant. Redemption follows that reference, validates the target Site belongs to the same Tenant, and rejects cross-Tenant code presentation before credential issuance or consumption.
- Site-originated security decisions use the authoritative `(site_id, api_id, principal_id)` runtime tuple. `site_id` is propagated independently and must equal the transaction/session Site; it is never recovered by searching for a Site that happens to use `api_id`.
- `site_runtime_clients` is the authorization source for the tuple. Multiple Sites may share the same API without becoming interchangeable, and the same API key/principal cannot act for an unregistered Site.
- Authentication-center and Site-local sessions cannot be linked or reused across Tenants. Globally unique identifiers, opaque state, a valid handoff code, or physical co-location in one database do not establish Tenant authorization.
- Every owning DB function must enforce this boundary in its predicates and locked transition. RLS is defense in depth and does not replace function-level validation.
- The DB PR resolves concrete Tenant-prefix naming, module discovery, and one-database versus cross-database routing according to the deployed repository topology. Every enabled Tenant still receives its own provisioned private SSO schema; Tenant/schema isolation is not open for reconsideration. A Tenant without enabled/provisioned SSO must fail explicitly rather than falling back to another or global schema.

### Private transient state

- Unified-transaction rows, OAuth authorization-request associations, handoff rows and hashes, authentication-center browser bindings, and identity outcomes are server-only private state. The plaintext handoff code and public transaction-bound `site_state` are the explicit browser transport values; the handoff plaintext is never persisted.
- No direct GraphQL CRUD or broad table grants are permitted for those relations.
- RLS remains enabled as defense in depth. All policies and function predicates must include the authoritative Tenant/database boundary; a browser-supplied Tenant or Site value is never sufficient.
- If reviewed `SECURITY DEFINER` functions are used for anonymous login operations, they must expose only narrow transitions, revoke default `PUBLIC` execution, grant only the required roles, follow repository function conventions, and validate every Tenant/Site/transaction boundary internally.
- SSO group is an authentication-reuse boundary, not an authorization group. It must not grant Tenant roles, Site access, schema access, or API/data permissions.

### Administrative state

- Site authentication configuration and callback administration reuse the existing Site/Tenant membership permission system.
- The DB PR selects exact required permission bits or named scopes from the current authorization registry rather than inventing them in SQL.
- Public discovery returns only safe display configuration and enabled sign-in methods. It never exposes client secrets, full callback registrations, private group topology, transaction rows, code hashes, session identifiers, or internal database details.

### Runtime callers

- Dashboard start/password/confirm operations run under the current resolved Tenant/database/request context.
- Provider callback restores its Tenant, Provider, and unified transaction exclusively from consumed server-side OAuth state and revalidated route context.
- Site redemption must prove possession of the one-time code and receive authoritative `site_id`, `api_id`, and `principal_id` from the trusted routing/runtime-authentication path. PostgreSQL requires the transaction Site and an exact `site_runtime_clients` tuple match before issuing credentials or consuming the code.
- `Origin` and `Referer` may be checked against registered Site data as auxiliary browser-request evidence, but missing or matching headers never create Site authority and cannot compensate for a missing/mismatched runtime tuple.
- No operation may bypass RLS through a manually inferred Tenant/database, direct secret query, legacy schema fallback, or alternate auth context.

## Indexes and Constraints

The DB PR should include query-plan tests or inspection for the following access patterns. It selects exact index names and shapes using current repository conventions.

At minimum, `site_runtime_clients` requires an exact unique lookup path for `(site_id, api_id, principal_id)` and owner-oriented lookup paths needed for administration and revocation. No index or alternate query may collapse this boundary to API-only Site selection.

| Relation | Required/proposed index or constraint | Status |
| --- | --- | --- |
| Site auth config | Unique Site reference; check `sign_in_mode`; check normalized `sso_group_key` | Cardinality/value behavior **Confirmed** |
| Site callbacks | Site + active + `created_at` + ID ordering index | Required to support confirmed deterministic selection |
| Unified transactions | Unique opaque identifier or identifier hash | Uniqueness/security **Confirmed**; representation is a DB PR security choice |
| Unified transactions | Expiry index; Site/Tenant lookup as required by cleanup/revalidation | Required access pattern; exact shape is a DB PR decision |
| OAuth requests | Unique state or state hash; expiry index; unified-transaction FK index | Lifecycle/link **Confirmed**; representation is a DB PR security choice |
| Handoffs | Unique code hash; expiry index; unified-transaction FK index | **Confirmed access needs** |
| Handoffs | Enforce at most one active handoff per transaction | **Confirmed lifecycle requirement**; constraint shape is a DB PR decision |
| Session binding | Lookup from Site-local session to unified session and revocation state | **Confirmed access need**; physical index is a DB PR decision |

Foreign keys must prevent cross-owner orphaning while respecting short-lived cleanup. The DB PR selects cascade/restrict behavior for Site deletion, callback deletion, transactions, OAuth requests, handoffs, sessions, and audit retention as one internally consistent lifecycle policy.

## Retention and Cleanup

- Handoff redeemability is exactly one minute (**Confirmed**).
- Unified transactions and Provider OAuth authorization requests each expire ten minutes after creation (**Confirmed**). Expiry is enforced independently of cleanup.
- Expiry is enforced during every consume/redeem operation; cleanup timing is not part of the security check.
- Purge operations delete expired transient rows after an operational/audit grace period. The DB PR selects bounded grace periods and batch sizes; they do not extend validity.
- Cleanup must be bounded and indexed, return observable row counts, tolerate retries, and avoid long locks on authentication paths.
- Existing `sso_private.purge_expired_oauth_requests` is a useful lifecycle pattern, not an automatic decision to keep its schema or retention value.
- Provider tokens, authorization codes, raw credentials, plaintext handoff codes, and raw browser-binding secrets have no retention window because they must not be persisted.
- Security audit events use the existing audit/error ownership and contain only safe identifiers and classified outcomes. They do not include Provider payloads, tokens, secrets, password values, callback code, or raw handoff code.

## Migrations and Backfill

### Source ownership

- Do not edit generated files under `application/constructive/` directly.
- Add or evolve the correct platform/metaschema/integration source module, its generator inputs, deploy/revert/verify units, and then regenerate committed application artifacts according to Constructive DB conventions.
- The physical source module/schema placement for the confirmed Site-owned configuration/callback and logical `site_runtime_clients` models, plus physical table/function names and source layout for SSO transient state, must be selected before writing migrations. Site logical ownership/cardinality, exact runtime-tuple authorization, and per-enabled-Tenant SSO schema ownership are already fixed.
- SSO module provisioning creates a separate Tenant-prefixed private SSO schema for each Tenant that enables SSO. Migration and module-discovery changes must target only that Tenant's provisioned schema, must not cross schemas, and must not assume the schema exists for a Tenant where SSO is not enabled/provisioned.

### Rollout shape

1. Add private persistence models, constraints, indexes, registered errors, and deploy/revert/verify coverage without enabling public login.
2. Add narrow PostgreSQL functions and their grants/RLS policies.
3. Expose permission-controlled administrative GraphQL operations and safe public start/discovery operations.
4. Enable Constructive orchestration only after the DB version, session-binding mechanism, and server options are pinned together.
5. Validate baseline, local password, Provider OAuth, handoff redemption, Site-local session, and unified revocation in that order.

### Existing data

- `connected_accounts`, current users/emails, identity providers, sessions, and session credentials remain authoritative and are not copied into new SSO tables.
- Existing Sites are backfilled with unified authentication disabled and `confirm` as the stored/default sign-in mode. This follows the confirmed default-off feature policy and avoids enabling a new trust path during migration. The DB PR selects the migration mechanics.
- Existing Sites and API/service-principal credentials do not receive inferred `site_runtime_clients` rows. Administrators provision explicit exact tuples before enabling unified authentication for a Site; until then Site redemption and Site-session authentication fail closed.
- Callback rows must not be inferred from existing routes, domains, CORS origins, Provider redirect URIs, or Host history. Administrators register each exact trusted callback explicitly.
- Existing `integrations/sso` OAuth requests are short-lived. Before changing that table, the DB PR verifies whether the integration is installed and selects a repository-compatible rollout for in-flight rows (for example, drain before deploy or a bounded migration). The new flow does not read `lane` or legacy `return_to`, and no compatibility fallback survives rollout.
- `pending_identity_links` data is not migrated into unified transactions or handoffs.
- No migration adds legacy multi-version lookup, old-schema fallback, parent-domain shared-cookie behavior, or long-lived URL credential transport. The confirmed one-minute, one-time handoff query is the only Site callback credential exception.

## Testing Strategy

### Database-owned tests

Use the repository's `pgsql-test`/Jest infrastructure or the owning module's equivalent existing harness. Tests should provision a real isolated database and exercise the actual generated objects rather than mocking PostgreSQL.

Required coverage:

- module provisioning creates an isolated Tenant-prefixed private SSO schema only for each enabled/provisioned Tenant; runtime discovery selects the current Tenant's schema, rejects cross-schema substitution, and fails explicitly when the current Tenant has no SSO module;
- Site configuration one-to-one constraint, mode default/check, group normalization/check, and Tenant isolation;
- exact callback acceptance and rejection, disabled callbacks, no-callback deterministic selection, and stable tie-breaking;
- exact `site_runtime_clients` tuple authorization, duplicate prevention, removal/revocation, wrong Site/API/principal rejection, and two Sites safely sharing one API without identity ambiguity;
- transaction creation rollback on any invalid Site/callback/`returnTo`/Tenant input;
- no public read/status path for transaction rows;
- transaction expiry, wrong browser/Tenant/Site/group, duplicate completion, and concurrent transitions;
- Provider OAuth request linkage to the correct transaction, state mismatch/expiry/replay rejection, verifier server-side persistence, and atomic consumption;
- SSO password wrapper boundary validation, exactly-one local `sign_in` invocation per submission, preserved safe failure, manual resubmission, and unchanged credential outcome;
- local registration wrapper reuse of `sign_up`, immediate auth-center session outcome, transaction association, rollback, and shared-completion convergence;
- normalized external identity: existing `(service, identifier)` login, unowned-email provisioning, owned-email conflict, connected-account uniqueness race, and rollback of partial provisioning;
- handoff one-minute expiry, plaintext-not-persisted assertion, hash uniqueness, wrong Site/Tenant/runtime-tuple rejection, transient pre-consume rollback/retry, and exactly one winner under concurrent redemption;
- Site credential issuance and handoff consumption in one transaction;
- Site-local session rejection after the DB PR implements the required unified-session binding;
- RLS/grant checks for anonymous, authenticated, Site-server, Tenant administrator, wrong Tenant, and direct-table access;
- fail-closed rejection when a Site or flow requires Constructive `strictAuth`, local MFA, or step-up authentication;
- purge correctness, bounded batches, active-row preservation, and repeated cleanup safety;
- deploy, verify, revert, and regeneration consistency; and
- migration behavior for existing Sites and any installed legacy SSO module.

### Constructive integration tests

The DB PR should expose stable seams for Constructive's higher-level tests, which use the real GraphQL server, Express Context, Tenant/database routing, DB functions, session/Cookie behavior, and callback lifecycle. Mock only the external Provider authorization/token/user-info boundary. Higher layers must not query private SSO or `connected_accounts` tables to assert implementation details; DB invariants remain in the owning DB tests.

### Security and negative tests

- Property/fuzz cases for callback exactness, `returnTo`, group keys, opaque identifiers, and code/state encodings.
- Concurrent callback and handoff replay attempts.
- Callback/Site reassignment or disablement during an in-flight transaction.
- Cross-Tenant, cross-database, cross-Site, and cross-group substitution.
- API-only Site inference, principal substitution, shared-API cross-Site redemption, caller-supplied Site substitution, and spoofed/missing `Origin`/`Referer` cases proving those headers are not authority.
- Provider state linked to the wrong unified transaction.
- Exact GET callback and query encoding, Site-side `site_state` correlation, immediate clean redirect after redemption, and prevention of handoff/`site_state` leakage through cache, referrer, proxy/access/APM/analytics, or error logs at the Constructive integration owner.
- Logging/error snapshots proving that secrets, raw codes, hashes, verifier, tokens, Provider payloads, callback lists, and internal SQL details are absent.

## Decision Classification

### A — Confirmed or Directly Derived Conclusions

The following items are settled by the requirements, formal Spec, verified DB contracts, or a necessary consequence of those decisions. They are not implementation questions for the user:

- Site authentication configuration is Site-owned one-to-one, and callbacks are Site-owned one-to-many with exact active matching and deterministic default selection.
- Every enabled Tenant receives its own Tenant-prefixed private SSO schema. All transient state and session reuse remain inside the authoritative Tenant boundary; no global or fallback SSO schema is allowed.
- The existing Tenant-local OAuth authorization-request table is evolved with a unified-transaction reference. New flows ignore legacy `lane` and keep validated `returnTo` only on the unified transaction.
- Unified transactions are active-flow-only, have one authenticated identity outcome, expose no recovery/status query, and are not resumed after interruption, invalid state, or failed Provider flow.
- The authentication-center first-party session/request context provides the authoritative browser binding. Heuristic browser fingerprints cannot replace it; the physical binding representation is a DB PR choice.
- The Site-created `site_state` is a separate public correlation binding on the unified transaction. It is returned beside the handoff so the Site can validate the initiating browser, but it never replaces handoff, Tenant, or Site/runtime authentication.
- Constructive generates OAuth state, PKCE verifier/nonce, and handoff plaintext with the owning cryptographic packages; PostgreSQL persists only the required server-side values and the handoff hash.
- Site, callback, Tenant, SSO group, and current enablement are revalidated at the final handoff/redemption boundaries. A snapshot may support deterministic processing but never replaces live trust validation.
- A completed transaction creates at most one handoff. The same unconsumed code may be retried after a transient exchange failure during its one-minute lifetime; no replacement code is minted for that transaction in v1.
- Current-browser global logout revokes the unified session, and every bound Site-local session becomes unusable on its next protected request. The physical binding belongs to the sessions/SSO owner.
- Handoff redemption authenticates the target Site/runtime through the exact `(site_id, api_id, principal_id)` tuple carried by routing/runtime authentication and pgSettings and authorized by `site_runtime_clients`, in addition to validating the code and transaction-bound context. Site is not inferred from API, `Origin`/`Referer` are never authoritative, and no parallel SSO-specific secret or credential system is added.
- Unified login transactions and Provider OAuth authorization requests each expire ten minutes after creation.
- Local password and registration reuse unchanged `sign_in` and `sign_up`; Provider identities reuse unchanged `sign_in_identity`, `sign_up_identity`, and `connected_accounts` through narrow SSO wrappers.
- Sites or flows requiring Constructive `strictAuth`, local MFA, or step-up authentication are outside v1 SSO integration and fail closed. A future implementation requires a separate design based on an actual use case and cannot downgrade or bypass those policies.
- First-time external identity provisioning follows the confirmed `sign_up_identity` path when the email is unowned. Provider enablement remains the availability control; v1 adds no separate auto-provision policy switch.
- Stable public error semantics, cause preservation, secret redaction, real DB integration tests, and external-Provider-only mocks remain mandatory.

### B — DB PR Implementation Decisions

The implementing DB PR resolves the following from the live repository's owner, generator, migration, error, authorization, and test conventions. These choices require evidence and review in the PR, but are not user-facing open decisions:

- physical module/schema/table/column/function/GraphQL names, including the repository-local physical name and placement of logical `site_runtime_clients`, SQL and GraphQL types, IDs, FKs, state/timestamp representation, and Tenant-prefix discovery mechanics;
- opaque identifier/state/hash-at-rest representations and repository-approved PostgreSQL storage/index types for Constructive-generated secure random material;
- exact wrapper composition, session/credential primitive integration, unified-to-Site session-binding relation, and one-database versus cross-database routing mechanics while preserving confirmed Tenant isolation;
- snapshots versus references, authenticated-outcome references, browser-binding storage, locking, uniqueness, indexes, query plans, cascades, and transaction-state representation;
- exact permission bits/roles/policies selected from the existing registry, canonical error-registry entries, safe audit fields, and GraphQL exposure annotations;
- existing-Site backfill mechanics using disabled + `confirm`, legacy OAuth row draining/migration and `lane`/`return_to` removal timing, generated-artifact rollout, and deploy/revert/verify structure; and
- cleanup ownership, cadence, batches, operational grace retention, monitoring, and alerts. None of these choices may extend an artifact's validity or weaken confirmed boundaries.
