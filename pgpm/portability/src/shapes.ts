import { PgpmRouteEntry, PgpmRouteKind, PgpmRoutingProfile } from '@pgpmjs/types';

/** A vendor-owned object that portable SQL may reference. */
export interface VendorObjectRef {
  schema: string;
  kind: PgpmRouteKind;
  name: string;
}

/**
 * A vendor's database shape: the schemas, roles, and objects its managed
 * subsystems own — the "weirdnesses" a package must be translated across when
 * it moves between the vendor and a plain-PostgreSQL/pgpm environment.
 */
export interface VendorShape {
  /** Vendor identifier (e.g. `supabase`). */
  vendor: string;
  /**
   * Schemas owned by the vendor's managed auth subsystem. Moving *off* the
   * vendor excludes these and substitutes a provider; moving *onto* the
   * vendor rebinds onto the native subsystem.
   */
  authSchemas: string[];
  /**
   * Schema the vendor installs extensions into (`null`: extensions live on
   * the default `search_path`, no qualification).
   */
  extensionsSchema: string | null;
  /** The vendor's application-facing role names. */
  roles: string[];
  /** The vendor's canonical users table, the usual FK target. */
  users?: VendorObjectRef;
  /**
   * Auth accessor functions application SQL calls (e.g. `auth.uid()`),
   * which must be rebound onto the substitute provider's equivalents.
   */
  accessors: VendorObjectRef[];
}

/** Supabase: `auth` subsystem, `extensions` schema, `auth.uid()`/`auth.role()`. */
export const supabase: VendorShape = {
  vendor: 'supabase',
  authSchemas: ['auth'],
  extensionsSchema: 'extensions',
  roles: ['anon', 'authenticated', 'service_role'],
  users: { schema: 'auth', kind: 'table', name: 'users' },
  accessors: [
    { schema: 'auth', kind: 'function', name: 'uid' },
    { schema: 'auth', kind: 'function', name: 'role' }
  ]
};

/**
 * InsForge: `auth` subsystem with `auth.users` and the `auth.uid()` claim
 * accessor, extensions on the default search path (no extensions schema).
 */
export const insforge: VendorShape = {
  vendor: 'insforge',
  authSchemas: ['auth'],
  extensionsSchema: null,
  roles: ['anon', 'authenticated', 'project_admin'],
  users: { schema: 'auth', kind: 'table', name: 'users' },
  accessors: [{ schema: 'auth', kind: 'function', name: 'uid' }]
};

/**
 * How a substitute provider binds a vendor's auth surface: where the
 * provider's objects live and which of its objects replace each vendor
 * object. Used in both directions — the inverse binding round-trips.
 */
export interface ProviderBinding {
  /** Schema the provider's objects live in (`null`: unqualified). */
  schema: string | null;
  /** Provider's users-table name replacing the vendor users table. */
  users?: string;
  /** Vendor accessor name → provider function name (e.g. `uid` → `current_user_id`). */
  accessors?: Record<string, string>;
  /** Vendor role name → target role name. */
  roles?: Record<string, string>;
}

function routesFor(shape: VendorShape, provider: ProviderBinding, invert: boolean): PgpmRouteEntry[] {
  const routes: PgpmRouteEntry[] = [];

  if (invert && provider.schema === null && (provider.users || provider.accessors)) {
    throw new Error(
      `toVendorProfile(${shape.vendor}): provider objects must live in a named schema ` +
        `to be routed back onto the vendor (provider.schema is null)`
    );
  }

  if (shape.users && provider.users) {
    routes.push(
      invert
        ? {
            fromSchema: provider.schema!,
            kind: shape.users.kind,
            name: provider.users,
            toSchema: shape.users.schema,
            ...(provider.users !== shape.users.name ? { toName: shape.users.name } : {})
          }
        : {
            fromSchema: shape.users.schema,
            kind: shape.users.kind,
            name: shape.users.name,
            toSchema: provider.schema,
            ...(provider.users !== shape.users.name ? { toName: provider.users } : {})
          }
    );
  }

  for (const accessor of shape.accessors) {
    const target = provider.accessors?.[accessor.name];
    if (!target) continue;
    routes.push(
      invert
        ? {
            fromSchema: provider.schema!,
            kind: accessor.kind,
            name: target,
            toSchema: accessor.schema,
            ...(target !== accessor.name ? { toName: accessor.name } : {})
          }
        : {
            fromSchema: accessor.schema,
            kind: accessor.kind,
            name: accessor.name,
            toSchema: provider.schema,
            ...(target !== accessor.name ? { toName: target } : {})
          }
    );
  }

  return routes;
}

function invertRoles(roles?: Record<string, string>): Record<string, string> | undefined {
  if (!roles) return undefined;
  return Object.fromEntries(Object.entries(roles).map(([from, to]) => [to, from]));
}

/**
 * Routing profile for moving a package *off* a vendor onto plain
 * PostgreSQL/pgpm: exclude the vendor's auth subsystem, rebind the users FK
 * and accessor calls onto the substitute provider, de-qualify (or re-route)
 * extension symbols, and translate role names.
 */
export function fromVendorProfile(shape: VendorShape, provider: ProviderBinding): PgpmRoutingProfile {
  return {
    exclude: { schemas: [...shape.authSchemas] },
    route: routesFor(shape, provider, false),
    ...(shape.extensionsSchema
      ? { extensions: { toSchema: null, from: [shape.extensionsSchema] } }
      : {}),
    ...(provider.roles ? { roles: { ...provider.roles } } : {})
  };
}

/**
 * The inverse of {@link fromVendorProfile}: move a pgpm-shaped package *onto*
 * the vendor's native subsystem — rebind the provider's objects back onto the
 * vendor's, qualify extension symbols into the vendor's extensions schema,
 * and translate roles back to the vendor's names.
 */
export function toVendorProfile(shape: VendorShape, provider: ProviderBinding): PgpmRoutingProfile {
  return {
    route: routesFor(shape, provider, true),
    ...(shape.extensionsSchema
      ? { extensions: { toSchema: shape.extensionsSchema, from: [null] } }
      : {}),
    ...(provider.roles ? { roles: invertRoles(provider.roles)! } : {})
  };
}
