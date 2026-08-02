import type { SafegresConfig } from './types';

/**
 * Built-in presets, resolvable via `extends: 'safegres:<name>'`.
 * A preset is just a partial config; users can publish their own as files
 * or npm packages.
 */

/**
 * Today's default behavior: every rule at its registry default severity.
 *
 * The untrusted-role rules take whichever roles the surface says are reachable
 * without credentials, so a declared `exposure.anonRoles` (or an adapter that
 * resolves one) is enough to switch them on. With no such surface `anonRoles`
 * is empty and they stay inert, exactly as before.
 */
export const recommended: SafegresConfig = {
  rules: {
    // The convention linter (`C*`) enforces Constructive house style rather
    // than a universal security fact, so the big-tent preset leaves it off;
    // the `constructive` preset turns it on.
    'C*': 'off',
    R1: ['critical', { rolesFrom: 'anon' }],
    R2: ['high', { rolesFrom: 'anon' }],
    L5: ['info', { rolesFrom: 'anon' }],
    // Signal-only for now: an unauthenticated role that can SET ROLE to a role
    // with more reach is a real escalation, but the rule is new and unproven,
    // so it reports at zero weight until validated. See the registry entry.
    L7: ['info', { rolesFrom: 'anon' }],
    // Same posture, same reason: a view that executes as its owner hands its
    // readers that owner's reach, which is a real bypass, but the rule is new
    // and body-derived, so it reports at zero weight until validated.
    L8: ['info', { rolesFrom: 'anon' }],
    // The write half of the same story: an auto-updatable definer view, and a
    // rewrite rule whose action runs as the view owner. Same posture again —
    // new, body-derived, zero weight until validated.
    L9: ['info', { rolesFrom: 'anon' }],
    L10: ['info', { rolesFrom: 'anon' }],
    // The other two ways a readable view is not what its definition says: a
    // materialized view serves rows RLS never filtered, and a filtering view
    // without `security_barrier` is not a boundary. Same posture again.
    L11: ['info', { rolesFrom: 'anon' }],
    L12: ['info', { rolesFrom: 'anon' }],
    // Reach that only `pg_attribute.attacl` shows. New, so zero weight — but
    // note this one is catalog-derived, not body-derived: what was missing was
    // the introspection, not the proof.
    L13: ['info', { rolesFrom: 'anon' }],
    // The coverage half of L8: a body reference the audit could not follow
    // because the schema was out of scope. Reports an unknown, never a leak.
    L14: ['info', { rolesFrom: 'anon' }],
    // The write-side twin of L12: a writable view whose `WHERE` is a read
    // filter only, because `WITH CHECK OPTION` is not the default. Same
    // posture again.
    L15: ['info', { rolesFrom: 'anon' }]
  }
};

/**
 * Everything on and escalated. Fail-closed hygiene findings (dead grants,
 * locked tables) are re-tuned upward and even contribute a fraction of
 * their weight to the score.
 */
export const strict: SafegresConfig = {
  extends: 'safegres:recommended',
  rules: {
    A1: 'medium',
    A3: 'medium',
    A4: 'high',
    A5: 'medium',
    A6: 'medium',
    A8: 'medium',
    P1b: 'high'
  },
  scoring: { failClosedWeight: 0.25 },
  failOn: { severity: 'high' }
};

/**
 * Tuned for Constructive's architecture:
 * - the exposure surface auto-resolves from the routing plane
 *   (`routing_public.apis` → `api_schemas` → `metaschema_public.schema`),
 *   so only what the exposed APIs can reach drives the score;
 * - untrusted-role rules watch `anonymous`; anything that can leak rows
 *   across the role boundary is critical;
 * - A3 is demoted to `info` rather than switched off — API roles never own
 *   tables in the Constructive model, so non-FORCEd RLS is not an exposure
 *   here, but the finding stays visible (info carries zero weight, so the
 *   score is identical to switching it off) and re-tunable;
 * - `pg_partman`'s schema is skipped: it creates child partitions and
 *   templates at runtime with no dependency on the extension, so ownership
 *   alone leaves them looking like unsecured application tables.
 */
export const constructive: SafegresConfig = {
  extends: 'safegres:recommended',
  exposure: { resolver: 'constructive' },
  extensions: { ignore: ['pg_partman'] },
  rules: {
    A2: 'critical',
    A3: 'info',
    P5: 'critical',
    // Each API declares its own `anon_role`; the adapter reads it, so a
    // custom one is picked up instead of being missed, with the platform
    // default kept explicitly so an unresolved surface still checks it.
    // `role_name` (`authenticated`) is deliberately *not* included: a
    // signed-in user holding a write grant is the product, not a finding.
    R1: ['critical', { roles: ['anonymous'], rolesFrom: 'anon' }],
    R2: ['high', { roles: ['anonymous'], rolesFrom: 'anon' }],
    R3: 'medium',
    L5: ['info', { roles: ['anonymous'], rolesFrom: 'anon' }],
    // House-style convention rules, enforced here for the first time:
    // never set search_path (C1), never use #variable_conflict (C2),
    // schema-qualify every relation (C3, adoption severity — ratchet to
    // error once clean), and no dynamic SQL (C4) unless waived inline with a
    // categorized reason (`-- safegres-disable-next-line no-dynamic-sql --
    // lookup-only: …`).
    C1: 'high',
    C2: 'medium',
    C3: 'low',
    C4: 'high'
  },
  scoring: { floorOnCritical: 'C' }
};

/** Structural flags only — a fast CI smoke check. */
export const minimal: SafegresConfig = {
  rules: {
    '*': 'off',
    A1: 'critical',
    A2: 'high',
    A3: 'medium'
  }
};

/**
 * PostgREST: the exposed schemas come from `pgrst.db_schemas` in the catalog,
 * and `anon` is the role an unauthenticated request runs as — so anything it
 * can write, or any policy that lets it through, is the whole threat model.
 *
 * The connecting role (`authenticator`) is graded as a secondary plane rather
 * than folded into the headline: it can `SET ROLE`, so its own grants are a
 * separate question from what the API serves.
 */
export const postgrest: SafegresConfig = {
  extends: 'safegres:recommended',
  exposure: { adapters: ['postgrest'] },
  rules: {
    // The anon role is `pgrst.db_anon_role`, so the adapter knows its name and
    // the rules take it from the resolved surface rather than assuming `anon`.
    R1: ['critical', { rolesFrom: 'anon' }],
    R2: ['critical', { rolesFrom: 'anon' }],
    R3: 'high',
    L5: ['high', { rolesFrom: 'anon' }]
  },
  scoring: { floorOnCritical: 'C' }
};

/**
 * Supabase is PostgREST with a fixed role vocabulary: `anon` (unauthenticated)
 * and `authenticated` (any signed-up user — a much weaker boundary than it
 * reads, since anyone can sign up) are both untrusted; `service_role` bypasses
 * RLS by design, so its plane reports as skipped rather than F.
 *
 * `auth`, `storage`, `realtime`, `vault` and friends are Supabase's own
 * schemas: they ship with their own policies and are not the developer's to
 * fix, so they are scoped out of the score while staying in the report.
 */
export const supabase: SafegresConfig = {
  extends: 'safegres:postgrest',
  exposure: { adapters: ['supabase'] },
  rules: {
    // Both are named outright, not just the anon one: on Supabase anyone can
    // sign up, so `authenticated` is a boundary the internet crosses at will.
    // Fixed by the platform, so unlike PostgREST's anon role they are safe to
    // name — and the adapter's anon set unions in on a self-hosted project.
    R1: ['critical', { roles: ['anon', 'authenticated'], rolesFrom: 'anon' }],
    R2: ['critical', { roles: ['anon', 'authenticated'], rolesFrom: 'anon' }],
    L5: ['high', { roles: ['anon', 'authenticated'], rolesFrom: 'anon' }]
  },
  overrides: [
    // Supabase-managed schemas: their policies ship with the platform, not
    // with your migrations. Demoted, not excluded — still in the report.
    {
      tables: [
        'auth.*',
        'storage.*',
        'realtime.*',
        'vault.*',
        'extensions.*',
        'graphql.*',
        'supabase_migrations.*'
      ],
      rules: { '*': 'info' }
    }
  ]
};

/**
 * PostGraphile / graphile-starter: `app_public` is served, `app_hidden` is
 * reachable through it, `app_private` is not exposed.
 *
 * The request role is `<app>_visitor` — project-specific, so it cannot be
 * named here. The adapter resolves it from role membership and the rules take
 * it from there. Every request runs as that role, authenticated or not (the
 * caller is a JWT claim, not a role), which is exactly what makes it
 * untrusted.
 *
 * A3 stays at its default: in this layout the API role is *not* the table
 * owner, so a missing FORCE genuinely is an owner-bypass hole.
 */
export const graphile: SafegresConfig = {
  extends: 'safegres:recommended',
  exposure: { adapters: ['graphile'] },
  rules: {
    // Every request is the visitor role, signed in or not, so for graphile the
    // anon set and the API-edge set are the same thing.
    R1: ['high', { rolesFrom: 'anon' }],
    R2: ['high', { rolesFrom: 'anon' }],
    R3: 'high',
    L5: ['medium', { rolesFrom: 'anon' }]
  }
};

/** Hasura: the surface is whatever is *tracked* in `hdb_catalog`. */
export const hasura: SafegresConfig = {
  extends: 'safegres:recommended',
  exposure: { adapters: ['hasura'] },
  rules: {
    R1: ['critical', { roles: ['anonymous', 'public'] }],
    R2: ['critical', { roles: ['anonymous', 'public'] }],
    R3: 'high'
  },
  overrides: [
    // Hasura's own metadata catalog, managed by the engine.
    { tables: ['hdb_catalog.*'], rules: { '*': 'info' } }
  ]
};

/**
 * Tenancy posture, independent of stack: in a shared-table multi-tenant
 * database every RLS gap is a cross-tenant read, not a self-service leak, so
 * the row-visibility rules are escalated and a single critical caps the grade
 * at D. Owner-bypass hygiene is *not* escalated — it is a deployment property,
 * and drowning the report in it hides the boundary findings.
 *
 * Compose it: `"extends": ["safegres:supabase", "safegres:multi-tenant"]`.
 */
export const multiTenant: SafegresConfig = {
  rules: {
    A1: 'critical',
    A2: 'critical',
    A4: 'high',
    L1: 'critical',
    L2: 'critical',
    L3: 'high',
    L5: 'high',
    P5: 'high'
  },
  scoring: { floorOnCritical: 'D' },
  failOn: { severity: 'critical' }
};

/**
 * Perf posture for a read-heavy OLTP database, where a sequential scan behind
 * an RLS policy is a production incident rather than a slow report. Security
 * stays at whatever the composed preset says; this only retunes the P/X axis
 * and gates on the perf grade, which is only meaningful once a baseline
 * exists — see `--write-baseline`.
 */
export const oltp: SafegresConfig = {
  rules: {
    // The four that turn a policy into a per-row function call or defeat the
    // index it should be using — the difference between an index scan and a
    // seq scan per request.
    X2: 'critical',
    X3: 'critical',
    X4: 'high',
    X9: 'high',
    X1: 'high',
    X6: 'high',
    P1b: 'high',
    P5: 'high'
  },
  failOn: { perfGrade: 'C' }
};

export const PRESETS: Record<string, SafegresConfig> = {
  'safegres:recommended': recommended,
  'safegres:strict': strict,
  'safegres:constructive': constructive,
  'safegres:minimal': minimal,
  'safegres:postgrest': postgrest,
  'safegres:supabase': supabase,
  'safegres:graphile': graphile,
  'safegres:hasura': hasura,
  'safegres:multi-tenant': multiTenant,
  'safegres:oltp': oltp
};
