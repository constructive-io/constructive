/**
 * Content presets are the *contents* of a database, as opposed to module
 * presets, which are the modules a database installs. One entry becomes one
 * `content_presets` row — `(kind, slug)` keyed, merkle-versioned — and
 * provisioning resolves a slug to its definition by `(kind, slug)`.
 *
 * They live here, beside the module presets, for one reason: the numbers in a
 * trust ladder are product decisions, and a decision belongs somewhere a
 * reviewer can read it as a table of rows. Previously they were literal
 * `jsonb_build_object` calls inside a PL/pgSQL function, where changing what a
 * rung is worth meant editing a generator.
 *
 * Nothing here is privileged. A tenant that tunes its own rows and captures
 * them writes a row of exactly this shape, resolved by exactly the same
 * lookup — these are simply the ones we ship.
 */

import type { UIDocument } from 'blocks-schema';

import type { LimitDefault, TrustLadderRung } from '../module-presets/types';

/** The catalog kinds a content preset can be authored for. */
export type ContentPresetKind =
  | 'trust_ladder'
  | 'limit_defaults'
  | 'route_bindings'
  | 'pages'
  | 'robots'
  | 'principal';

/** Fields every content preset carries, whatever its kind. */
type ContentPresetBase = {
  /** Slug a caller names in module options, unique per kind. */
  slug: string;
  /** Human-readable label for a picker. */
  label: string;
  /** What this preset is for, and — where it matters — why the numbers are what they are. */
  description: string;
};

/**
 * A ladder of progressive trust: an ordered set of rungs, each naming the
 * evidence it wants and what earning it is worth. Rungs sharing a `group` are
 * alternatives — any one of them satisfies the rung, and they share one reward.
 */
export type TrustLadderPreset = ContentPresetBase & {
  kind: 'trust_ladder';
  rungs: TrustLadderRung[];
};

/** A baseline allowance an unproven principal starts with. */
export type LimitBaselinePreset = ContentPresetBase & {
  kind: 'limit_defaults';
  limits: LimitDefault[];
};

/**
 * One URL path served by one named function task, e.g.
 * `/login` -> `mantra:signin`. The task identifier is resolved through the
 * functions catalog at install time, so a binding names a task and never an
 * image, a scope, or a URL.
 */
export type FunctionRouteBinding = {
  /** Path the route claims on the site's hostname; never `/` or a catch-all. */
  path: string;
  /** Published function task that serves it. */
  task_identifier: string;
  /**
   * Whether the installed route answers callers carrying no identity. A page
   * set whose sign-in surface required a session would be unreachable, so a
   * binding states its half of the anonymous contract here; the targeted
   * definition must itself declare `anonymous_callable`.
   */
  anonymous?: boolean;
};

/**
 * One URL path the edge answers with a redirect onto another path of the same
 * hostname, e.g. `/` -> `/login` on a host that exists only to serve a page set.
 * A row in the routing plane's redirects table, not a function: no backend is
 * involved. The one binding kind allowed to take over an existing route — the
 * placeholder root the route guard created targeting the site itself.
 */
export type RedirectRouteBinding = {
  /** Path the route claims on the site's hostname. */
  path: string;
  target: 'redirect';
  /** Destination path on the same hostname; must start with `/`. */
  to_path: string;
  /** HTTP status the edge answers with; 302 when omitted. */
  status_code?: 301 | 302 | 307 | 308;
  /** Whether the installed route answers callers carrying no identity. */
  anonymous?: boolean;
};

/** One entry of a route-bindings preset. */
export type RouteBinding = FunctionRouteBinding | RedirectRouteBinding;

/**
 * A named set of path -> task bindings installed onto a site as ordinary
 * function-target routes. Which paths a page set owns is a product decision, so
 * it is a catalog row rather than a list inside a generator.
 */
export type RouteBindingsPreset = ContentPresetBase & {
  kind: 'route_bindings';
  bindings: RouteBinding[];
};

/**
 * One starter page of prose: a path and the `{title, body}` content a site's
 * merkle-backed pages store at it. `body` is blank-line-separated prose,
 * rendered escaped — never markup. It states no `kind` because untagged content
 * *is* prose to the page handlers, which is what every page written before the
 * discriminator existed holds.
 */
export type ProsePageDocument = {
  /** Path the page is served at on the site's hostname. */
  path: string;
  /** The page's own heading. */
  title: string;
  /** Blank-line-separated prose. */
  body: string;
};

/**
 * One starter page whose content is a block `UIDocument` — the blocks spec's
 * JSON, served by the page handlers' document renderer rather than as prose.
 *
 * A layout is exactly this: a document with `Slot` nodes, stored at the reserved
 * `_layout/<name>` path a request can never ask for, so the template a site
 * serves its pages in is a page row it owns, versioned by its own publishing.
 */
export type BlockPageDocument = {
  /** Path the page is served at, or `_layout/<name>` for a layout. */
  path: string;
  /** What the content holds, read by the page handlers before rendering it. */
  kind: 'block_document';
  /** The page's own heading, beside the document rather than in it. */
  title: string;
  /** The document itself, as `blocks-schema` accepts it. */
  document: UIDocument;
};

/** One starter page, of either content kind the page handlers serve. */
export type PageDocument = ProsePageDocument | BlockPageDocument;

/**
 * A named set of starter pages a site seeds into its merkle-backed pages and
 * then authors over. Installed as page rows — versioned by the site's own
 * publishing — never as a configuration blob.
 */
export type PagesPreset = ContentPresetBase & {
  kind: 'pages';
  pages: PageDocument[];
};

/**
 * One line of a `robots.txt`, in file order — a `User-agent:` group header, a
 * `Disallow:`, or an empty string separating groups. Lines rather than a parsed
 * shape because robots.txt is a line-oriented file whose grouping *is* its
 * order: a site's `robots` column is emitted verbatim, so what is authored here
 * is exactly what a crawler reads.
 */
export type RobotsDirective = string;

/**
 * A named starter `robots.txt` body a site adopts into its `robots` column.
 * Which crawlers a tenant feeds is a product decision, so it is a catalog row
 * rather than a list inside the emitter.
 */
export type RobotsPreset = ContentPresetBase & {
  kind: 'robots';
  directives: RobotsDirective[];
};

/**
 * The capability posture a principal preset grants at one membership scope.
 * Capabilities are named, never bit positions: the generated
 * `create_principal_from_preset` resolves each name against the tenant's own
 * capabilities table at instantiation, so one catalog row fits every tenant
 * whatever its bit width, and a name the tenant does not know fails loudly
 * instead of silently narrowing.
 */
export type PrincipalPresetScope = {
  /** Membership scope the mask applies at: `app` or `org`. */
  membership_type: 'app' | 'org';
  /**
   * Capability names the principal keeps at this scope. The owner's own
   * capabilities are AND-ed with this set, so it can only narrow — an empty
   * list keeps membership (reads) and drops every capability bit. `null` is
   * no mask at all: the principal keeps every bit the owner holds there.
   */
  allowed_mask_capabilities: string[] | null;
};

/**
 * Credential lifetimes a preset asks for. Each is an interval literal and may
 * only cap the tenant's `auth_settings` defaults, never exceed them.
 */
export type PrincipalPresetCredentials = {
  api_key_ttl: string;
  access_token_ttl: string;
  refresh_token_ttl: string;
  max_chain_age: string;
};

/**
 * The shape `create_principal_from_preset` instantiates. `permissions` in the
 * planning text is `scopes[].allowed_mask_capabilities` plus `is_read_only`;
 * `session_settings` is `credentials`. There is no `invocable_by`: only the
 * owning human may instantiate a principal, and organization reach is fenced
 * by the owner's own membership.
 */
export type PrincipalPresetDefinition = {
  is_read_only: boolean;
  use_admin_owner: boolean;
  bypass_step_up: boolean;
  scopes: PrincipalPresetScope[];
  /** `require_list`: the caller must scope the principal to named entities; `inherit_owner`: optional, defaults to the owner's reach. */
  entity_policy: 'require_list' | 'inherit_owner';
  delegation: {
    allowed: boolean;
    max_depth: number;
  };
  credentials: PrincipalPresetCredentials;
};

/**
 * A named blueprint for a principal — read-only analyst, deploy bot — that a
 * human instantiates in one call instead of composing create_principal +
 * set_principal_scope + set_principal_entities by hand. Catalog data, not
 * code: the row names capabilities and lifetimes, and the generated function
 * resolves them against the tenant it runs in.
 */
export type PrincipalPreset = ContentPresetBase & {
  kind: 'principal';
  definition: PrincipalPresetDefinition;
};

export type ContentPreset =
  | TrustLadderPreset
  | LimitBaselinePreset
  | RouteBindingsPreset
  | PagesPreset
  | RobotsPreset
  | PrincipalPreset;

/** The document provisioning installs for a preset: an array of rows, or one object for a principal. */
export function contentPresetDefinition(
  preset: ContentPreset
):
  | TrustLadderRung[]
  | LimitDefault[]
  | RouteBinding[]
  | PageDocument[]
  | RobotsDirective[]
  | PrincipalPresetDefinition {
  switch (preset.kind) {
  case 'principal':
    return preset.definition;
  case 'trust_ladder':
    return preset.rungs;
  case 'limit_defaults':
    return preset.limits;
  case 'route_bindings':
    return preset.bindings;
  case 'pages':
    return preset.pages;
  case 'robots':
    return preset.directives;
  }
}
