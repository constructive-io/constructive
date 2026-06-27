import type { PgTestClient } from 'pgsql-test';
import { TableClient, ident } from './table-client';
import type { SqlValue } from '@constructive-io/query-builder';

// ─── Resolved module info types ─────────────────────────────────────────────

interface ResolvedTable {
  schema: string;
  table: string;
}

interface ResolvedMemberships {
  memberships: ResolvedTable;
  defaults: ResolvedTable;
  grants: ResolvedTable;
  sprt: ResolvedTable;
}

interface ResolvedProfiles {
  profiles: ResolvedTable;
  profilePermissions: ResolvedTable;
  profileGrants: ResolvedTable;
  profileDefinitionGrants: ResolvedTable;
}

interface ResolvedPermissions {
  permissions: ResolvedTable;
  defaultPermissions: ResolvedTable;
  getMaskByName: string;
  bitlen: number;
}

// ─── Sub-client types ───────────────────────────────────────────────────────

export class UsersClient {
  private client: PgTestClient;
  private tc: TableClient;

  constructor(client: PgTestClient, resolved: ResolvedTable) {
    this.client = client;
    this.tc = new TableClient(client, resolved.schema, resolved.table);
  }

  /** Insert a user (type=1 for human, type=2 for org). */
  async insert(data: Record<string, SqlValue>): Promise<void> {
    await this.tc.insert(data);
  }

  /** Insert a user and return the created row. */
  async insertReturning<T = Record<string, unknown>>(
    data: Record<string, SqlValue>,
    returning?: string[]
  ): Promise<T> {
    return this.tc.insertReturning<T>(data, returning);
  }

  /** Create an organization (type=2 user). Returns the org ID. */
  async createOrganization(display_name: string): Promise<string> {
    const row = await this.tc.insertReturning<{ id: string }>(
      { display_name, type: 2 },
      ['id']
    );
    return row.id;
  }

  /** Find a user by column match. */
  async findOne<T = Record<string, unknown>>(
    where: Record<string, SqlValue>,
    columns?: string[]
  ): Promise<T> {
    return this.tc.findOne<T>(where, columns);
  }

  /** Find a user, returning null if not found. */
  async findOneOrNone<T = Record<string, unknown>>(
    where: Record<string, SqlValue>,
    columns?: string[]
  ): Promise<T | null> {
    return this.tc.findOneOrNone<T>(where, columns);
  }
}

export class MembershipsClient {
  private client: PgTestClient;
  private scope: string;
  private resolved: ResolvedMemberships;

  constructor(client: PgTestClient, scope: string, resolved: ResolvedMemberships) {
    this.client = client;
    this.scope = scope;
    this.resolved = resolved;
  }

  /** Get a TableClient for the memberships table. */
  membershipsTable(): TableClient {
    return new TableClient(this.client, this.resolved.memberships.schema, this.resolved.memberships.table);
  }

  /** Get a TableClient for the grants table. */
  grantsTable(): TableClient {
    return new TableClient(this.client, this.resolved.grants.schema, this.resolved.grants.table);
  }

  /** Get a TableClient for the defaults table. */
  defaultsTable(): TableClient {
    return new TableClient(this.client, this.resolved.defaults.schema, this.resolved.defaults.table);
  }

  /** Get a TableClient for the SPRT table. */
  sprtTable(): TableClient {
    return new TableClient(this.client, this.resolved.sprt.schema, this.resolved.sprt.table);
  }

  /** Add a member. Returns the membership ID. */
  async addMember(actor_id: string, entity_id?: string): Promise<string> {
    const data: Record<string, SqlValue> = { actor_id };
    if (entity_id !== undefined) {
      data.entity_id = entity_id;
    }
    const row = await this.membershipsTable().insertReturning<{ id: string }>(data, ['id']);
    return row.id;
  }

  /** Get a membership record by actor and entity. */
  async getMembership<T = Record<string, unknown>>(
    actor_id: string,
    entity_id?: string
  ): Promise<T | null> {
    const where: Record<string, SqlValue> = { actor_id };
    if (entity_id !== undefined) {
      where.entity_id = entity_id;
    }
    return this.membershipsTable().findOneOrNone<T>(where);
  }

  /** Get a membership ID by actor and optional entity. */
  async getMembershipId(actor_id: string, entity_id?: string): Promise<string> {
    const where: Record<string, SqlValue> = { actor_id };
    if (entity_id !== undefined) {
      where.entity_id = entity_id;
    }
    const row = await this.membershipsTable().findOne<{ id: string }>(where, ['id']);
    return row.id;
  }

  /** Get the profile_id from a membership. */
  async getProfileId(membership_id: string): Promise<string | null> {
    const row = await this.membershipsTable().findOne<{ profile_id: string | null }>(
      { id: membership_id },
      ['profile_id']
    );
    return row.profile_id;
  }

  /** Update a membership record. */
  async updateMembership(
    data: Record<string, SqlValue>,
    where: Record<string, SqlValue>
  ): Promise<void> {
    await this.membershipsTable().update(data, where);
  }

  /** Make a member an admin. */
  async makeAdmin(actor_id: string, entity_id?: string): Promise<void> {
    const where: Record<string, SqlValue> = { actor_id };
    if (entity_id !== undefined) {
      where.entity_id = entity_id;
    }
    await this.membershipsTable().update({ is_admin: true }, where);
  }

  /** Approve a membership. */
  async approve(actor_id: string, entity_id?: string): Promise<void> {
    const where: Record<string, SqlValue> = { actor_id };
    if (entity_id !== undefined) {
      where.entity_id = entity_id;
    }
    await this.membershipsTable().update({ is_approved: true }, where);
  }

  /** Grant permissions via the grants table. */
  async grantPermissions(
    actor_id: string,
    permissions: string,
    entity_id?: string
  ): Promise<void> {
    const data: Record<string, SqlValue> = {
      actor_id,
      permissions,
      is_grant: true,
    };
    if (entity_id !== undefined) {
      data.entity_id = entity_id;
    }
    await this.client.query(
      `INSERT INTO ${ident(this.resolved.grants.schema, this.resolved.grants.table)}
       (actor_id${entity_id !== undefined ? ', entity_id' : ''}, permissions, is_grant)
       VALUES ($1${entity_id !== undefined ? ', $2' : ''}, $${entity_id !== undefined ? '3' : '2'}::bit varying, true)
       ON CONFLICT DO NOTHING`,
      entity_id !== undefined
        ? [actor_id, entity_id, permissions]
        : [actor_id, permissions]
    );
  }

  /** Update SPRT permissions directly (requires superuser or admin role). */
  async updateSprtPermissions(
    actor_id: string,
    entity_id: string,
    permissions: string
  ): Promise<void> {
    await this.client.query(
      `UPDATE ${ident(this.resolved.sprt.schema, this.resolved.sprt.table)}
       SET permissions = permissions | $3::bit(64)
       WHERE actor_id = $1 AND entity_id = $2`,
      [actor_id, entity_id, permissions]
    );
  }

  /** Get membership defaults. */
  async getDefaults(entity_id?: string): Promise<Record<string, unknown> | null> {
    const where: Record<string, SqlValue> = {};
    if (entity_id !== undefined) {
      where.entity_id = entity_id;
    }
    return this.defaultsTable().findOneOrNone(where);
  }

  /** Set membership defaults. */
  async setDefaults(defaults: Record<string, SqlValue>, entity_id?: string): Promise<void> {
    if (entity_id !== undefined) {
      await this.client.query(
        `INSERT INTO ${ident(this.resolved.defaults.schema, this.resolved.defaults.table)}
           (entity_id, ${Object.keys(defaults).join(', ')})
         VALUES ($1, ${Object.keys(defaults).map((_, i) => `$${i + 2}`).join(', ')})
         ON CONFLICT (entity_id) DO UPDATE
           SET ${Object.keys(defaults).map((k, i) => `${k} = $${i + 2}`).join(', ')}`,
        [entity_id, ...Object.values(defaults)]
      );
    } else {
      const setClauses = Object.keys(defaults).map((k, i) => `${k} = $${i + 1}`).join(', ');
      await this.client.query(
        `UPDATE ${ident(this.resolved.defaults.schema, this.resolved.defaults.table)}
         SET ${setClauses}`,
        Object.values(defaults)
      );
    }
  }

  /** Get SPRT columns from information_schema. */
  async getSprtColumns(): Promise<string[]> {
    const cols = await this.client.any<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position`,
      [this.resolved.sprt.schema, this.resolved.sprt.table]
    );
    return cols.map((c) => c.column_name);
  }
}

export class ProfilesClient {
  private client: PgTestClient;
  private resolved: ResolvedProfiles;

  constructor(client: PgTestClient, resolved: ResolvedProfiles) {
    this.client = client;
    this.resolved = resolved;
  }

  /** Get a TableClient for the profiles table. */
  profilesTable(): TableClient {
    return new TableClient(this.client, this.resolved.profiles.schema, this.resolved.profiles.table);
  }

  /** Create a profile. Returns the profile ID. */
  async create(data: Record<string, SqlValue>): Promise<string> {
    const row = await this.profilesTable().insertReturning<{ id: string }>(data, ['id']);
    return row.id;
  }

  /** Create a profile definition grant (add a permission to a profile). Returns the grant ID. */
  async createDefinitionGrant(options: {
    profile_id: string;
    permission_id: string;
    is_grant?: boolean;
  }): Promise<string> {
    const { profile_id, permission_id, is_grant = true } = options;
    const tc = new TableClient(
      this.client,
      this.resolved.profileDefinitionGrants.schema,
      this.resolved.profileDefinitionGrants.table
    );
    const row = await tc.insertReturning<{ id: string }>(
      { profile_id, permission_id, is_grant },
      ['id']
    );
    return row.id;
  }

  /** Assign a profile to a membership. Returns the grant ID. */
  async createGrant(options: {
    membership_id: string;
    profile_id: string;
    entity_id: string;
    is_grant?: boolean;
  }): Promise<string> {
    const { membership_id, profile_id, entity_id, is_grant = true } = options;
    const tc = new TableClient(
      this.client,
      this.resolved.profileGrants.schema,
      this.resolved.profileGrants.table
    );
    const row = await tc.insertReturning<{ id: string }>(
      { membership_id, profile_id, entity_id, is_grant },
      ['id']
    );
    return row.id;
  }
}

export class PermissionsClient {
  private client: PgTestClient;
  private resolved: ResolvedPermissions;

  constructor(client: PgTestClient, resolved: ResolvedPermissions) {
    this.client = client;
    this.resolved = resolved;
  }

  /** Get a TableClient for the permissions table. */
  permissionsTable(): TableClient {
    return new TableClient(this.client, this.resolved.permissions.schema, this.resolved.permissions.table);
  }

  /** Get the first permission ID. */
  async getFirstId(): Promise<string> {
    const row = await this.permissionsTable().findMany<{ id: string }>({ columns: ['id'], limit: 1 });
    return row[0].id;
  }

  /** Get the permission mask for a set of permission names. */
  async getMask(perm_names: string[]): Promise<string> {
    const result = await this.client.one<{ mask: string }>(
      `SELECT ${ident(this.resolved.permissions.schema, this.resolved.getMaskByName)}($1::citext[]) AS mask`,
      [perm_names]
    );
    return result.mask;
  }

  /** Get the full permission mask (all bits set). */
  fullMask(): string {
    return '1'.repeat(this.resolved.bitlen || 64);
  }

  /** Set default permissions for an entity (insert or update). */
  async setEntityDefaults(entity_id: string, permissions?: string): Promise<void> {
    const mask = permissions ?? this.fullMask();
    const tc = new TableClient(
      this.client,
      this.resolved.defaultPermissions.schema,
      this.resolved.defaultPermissions.table
    );
    const existing = await tc.findOneOrNone({ entity_id });
    if (existing) {
      await tc.update({ permissions: mask }, { entity_id });
    } else {
      await tc.insert({ entity_id, permissions: mask });
    }
  }
}

// ─── Main TestUtils class ───────────────────────────────────────────────────

/** Resolved module context for a single database. */
export class TestUtils {
  readonly client: PgTestClient;
  readonly database_id: string;

  /** Users module client. Only available if users_module is installed. */
  readonly users: UsersClient | null;

  /** App-level memberships client. Only available if memberships_module is installed for scope='app'. */
  readonly appMemberships: MembershipsClient | null;

  /** Org-level memberships client. Only available if memberships_module is installed for scope='org'. */
  readonly orgMemberships: MembershipsClient | null;

  /** Org-level profiles client. Only available if profiles_module is installed for scope='org'. */
  readonly orgProfiles: ProfilesClient | null;

  /** App-level profiles client. Only available if profiles_module is installed for scope='app'. */
  readonly appProfiles: ProfilesClient | null;

  /** App-level permissions client. Only available if permissions_module is installed for scope='app'. */
  readonly appPermissions: PermissionsClient | null;

  /** Org-level permissions client. Only available if permissions_module is installed for scope='org'. */
  readonly orgPermissions: PermissionsClient | null;

  private constructor(
    client: PgTestClient,
    database_id: string,
    opts: {
      users: UsersClient | null;
      appMemberships: MembershipsClient | null;
      orgMemberships: MembershipsClient | null;
      orgProfiles: ProfilesClient | null;
      appProfiles: ProfilesClient | null;
      appPermissions: PermissionsClient | null;
      orgPermissions: PermissionsClient | null;
    }
  ) {
    this.client = client;
    this.database_id = database_id;
    this.users = opts.users;
    this.appMemberships = opts.appMemberships;
    this.orgMemberships = opts.orgMemberships;
    this.orgProfiles = opts.orgProfiles;
    this.appProfiles = opts.appProfiles;
    this.appPermissions = opts.appPermissions;
    this.orgPermissions = opts.orgPermissions;
  }

  /**
   * Create a TestUtils instance by resolving all module schemas from metaschema
   * for the given database_id.
   */
  static async create(client: PgTestClient, database_id: string): Promise<TestUtils> {
    const [users, appMemberships, orgMemberships, orgProfiles, appProfiles, appPermissions, orgPermissions] =
      await Promise.all([
        resolveUsers(client, database_id),
        resolveMembershipsForScope(client, database_id, 'app'),
        resolveMembershipsForScope(client, database_id, 'org'),
        resolveProfilesForScope(client, database_id, 'org'),
        resolveProfilesForScope(client, database_id, 'app'),
        resolvePermissionsForScope(client, database_id, 'app'),
        resolvePermissionsForScope(client, database_id, 'org'),
      ]);

    return new TestUtils(client, database_id, {
      users: users ? new UsersClient(client, users) : null,
      appMemberships: appMemberships ? new MembershipsClient(client, 'app', appMemberships) : null,
      orgMemberships: orgMemberships ? new MembershipsClient(client, 'org', orgMemberships) : null,
      orgProfiles: orgProfiles ? new ProfilesClient(client, orgProfiles) : null,
      appProfiles: appProfiles ? new ProfilesClient(client, appProfiles) : null,
      appPermissions: appPermissions ? new PermissionsClient(client, appPermissions) : null,
      orgPermissions: orgPermissions ? new PermissionsClient(client, orgPermissions) : null,
    });
  }

  /** Set the authenticated JWT context on the client. */
  setUserContext(user_id: string): void {
    this.client.setContext({
      role: 'authenticated',
      'jwt.claims.user_id': user_id,
      'jwt.claims.principal_id': user_id,
      'jwt.claims.database_id': this.database_id,
    });
  }

  /** Seed a user into the database's users table. */
  async seedUser(data: Record<string, SqlValue>): Promise<void> {
    if (!this.users) {
      throw new Error('users_module not installed for this database');
    }
    await this.users.insert(data);
  }

  /** Seed a user and return the created row. */
  async seedUserReturning<T = Record<string, unknown>>(
    data: Record<string, SqlValue>,
    returning?: string[]
  ): Promise<T> {
    if (!this.users) {
      throw new Error('users_module not installed for this database');
    }
    return this.users.insertReturning<T>(data, returning);
  }

  /** Create an organization (type=2 user). Returns the org ID. */
  async createOrganization(display_name: string): Promise<string> {
    if (!this.users) {
      throw new Error('users_module not installed for this database');
    }
    return this.users.createOrganization(display_name);
  }
}

// ─── Resolution helpers ─────────────────────────────────────────────────────

async function resolveUsers(
  client: PgTestClient,
  database_id: string
): Promise<ResolvedTable | null> {
  const row = await client.oneOrNone<{ schema_name: string; table_name: string }>(
    `SELECT s.schema_name, um.table_name
     FROM metaschema_modules_public.users_module um
     JOIN metaschema_public.schema s ON s.id = um.schema_id
     WHERE um.database_id = $1`,
    [database_id]
  );
  if (!row) return null;
  return { schema: row.schema_name, table: row.table_name };
}

async function resolveMembershipsForScope(
  client: PgTestClient,
  database_id: string,
  scope: string
): Promise<ResolvedMemberships | null> {
  const row = await client.oneOrNone<{
    m_schema: string;
    m_table: string;
    d_schema: string;
    d_table: string;
    g_schema: string;
    g_table: string;
    s_schema: string;
    s_table: string;
  }>(
    `SELECT
       ms.schema_name AS m_schema, mt.name AS m_table,
       ds.schema_name AS d_schema, dt.name AS d_table,
       gs.schema_name AS g_schema, gt.name AS g_table,
       ss.schema_name AS s_schema, st.name AS s_table
     FROM metaschema_modules_public.memberships_module mm
     JOIN metaschema_public.table mt ON mt.id = mm.memberships_table_id
     JOIN metaschema_public.schema ms ON ms.id = mt.schema_id
     JOIN metaschema_public.table dt ON dt.id = mm.membership_defaults_table_id
     JOIN metaschema_public.schema ds ON ds.id = dt.schema_id
     JOIN metaschema_public.table gt ON gt.id = mm.grants_table_id
     JOIN metaschema_public.schema gs ON gs.id = gt.schema_id
     JOIN metaschema_public.table st ON st.id = mm.sprt_table_id
     JOIN metaschema_public.schema ss ON ss.id = st.schema_id
     WHERE mm.database_id = $1 AND mm.scope = $2`,
    [database_id, scope]
  );
  if (!row) return null;
  return {
    memberships: { schema: row.m_schema, table: row.m_table },
    defaults: { schema: row.d_schema, table: row.d_table },
    grants: { schema: row.g_schema, table: row.g_table },
    sprt: { schema: row.s_schema, table: row.s_table },
  };
}

async function resolveProfilesForScope(
  client: PgTestClient,
  database_id: string,
  scope: string
): Promise<ResolvedProfiles | null> {
  const row = await client.oneOrNone<{
    p_schema: string;
    p_table: string;
    pp_schema: string;
    pp_table: string;
    pg_schema: string;
    pg_table: string;
    pdg_schema: string;
    pdg_table: string;
  }>(
    `SELECT
       ps.schema_name AS p_schema, pt.name AS p_table,
       pps.schema_name AS pp_schema, ppt.name AS pp_table,
       pgs.schema_name AS pg_schema, pgt.name AS pg_table,
       pdgs.schema_name AS pdg_schema, pdgt.name AS pdg_table
     FROM metaschema_modules_public.profiles_module pm
     JOIN metaschema_public.table pt ON pt.id = pm.table_id
     JOIN metaschema_public.schema ps ON ps.id = pm.schema_id
     JOIN metaschema_public.table ppt ON ppt.id = pm.profile_permissions_table_id
     JOIN metaschema_public.schema pps ON pps.id = ppt.schema_id
     JOIN metaschema_public.table pgt ON pgt.id = pm.profile_grants_table_id
     JOIN metaschema_public.schema pgs ON pgs.id = pgt.schema_id
     JOIN metaschema_public.table pdgt ON pdgt.id = pm.profile_definition_grants_table_id
     JOIN metaschema_public.schema pdgs ON pdgs.id = pdgt.schema_id
     WHERE pm.database_id = $1 AND pm.scope = $2`,
    [database_id, scope]
  );
  if (!row) return null;
  return {
    profiles: { schema: row.p_schema, table: row.p_table },
    profilePermissions: { schema: row.pp_schema, table: row.pp_table },
    profileGrants: { schema: row.pg_schema, table: row.pg_table },
    profileDefinitionGrants: { schema: row.pdg_schema, table: row.pdg_table },
  };
}

async function resolvePermissionsForScope(
  client: PgTestClient,
  database_id: string,
  scope: string
): Promise<ResolvedPermissions | null> {
  const row = await client.oneOrNone<{
    schema_name: string;
    table_name: string;
    default_schema: string;
    default_table: string;
    get_mask_by_name: string;
    bitlen: number;
  }>(
    `SELECT
       s.schema_name, t.name AS table_name,
       ds.schema_name AS default_schema, dt.name AS default_table,
       pm.get_mask_by_name, pm.bitlen
     FROM metaschema_modules_public.permissions_module pm
     JOIN metaschema_public.table t ON t.id = pm.table_id
     JOIN metaschema_public.schema s ON s.id = t.schema_id
     JOIN metaschema_public.table dt ON dt.id = pm.default_permissions_table_id
     JOIN metaschema_public.schema ds ON ds.id = dt.schema_id
     WHERE pm.database_id = $1 AND pm.scope = $2`,
    [database_id, scope]
  );
  if (!row) return null;
  return {
    permissions: { schema: row.schema_name, table: row.table_name },
    defaultPermissions: { schema: row.default_schema, table: row.default_table },
    getMaskByName: row.get_mask_by_name,
    bitlen: row.bitlen,
  };
}
