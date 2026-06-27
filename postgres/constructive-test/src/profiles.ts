import type { PgTestClient } from 'pgsql-test';

export interface CreateOrgProfileOptions {
  name: string;
  entity_id: string;
  slug?: string;
  description?: string;
}

/**
 * Create an org profile. Returns the profile ID.
 */
export async function createOrgProfile(
  client: PgTestClient,
  options: CreateOrgProfileOptions
): Promise<string> {
  const { name, entity_id, slug, description } = options;

  const columns = ['name', 'entity_id'];
  const values: unknown[] = [name, entity_id];
  const placeholders = ['$1', '$2'];

  if (slug !== undefined) {
    columns.push('slug');
    values.push(slug);
    placeholders.push(`$${values.length}`);
  }

  if (description !== undefined) {
    columns.push('description');
    values.push(description);
    placeholders.push(`$${values.length}`);
  }

  const result = await client.one<{ id: string }>(
    `INSERT INTO constructive_profiles_public.org_profiles (${columns.join(', ')})
     VALUES (${placeholders.join(', ')})
     RETURNING id`,
    values
  );

  return result.id;
}

/**
 * Get the first org permission ID.
 */
export async function getOrgPermissionId(
  client: PgTestClient
): Promise<string> {
  const result = await client.one<{ id: string }>(
    `SELECT id FROM constructive_permissions_public.org_permissions LIMIT 1`
  );
  return result.id;
}

/**
 * Create an org profile definition grant (add a permission to a profile).
 * Returns the grant ID.
 */
export async function createOrgProfileDefinitionGrant(
  client: PgTestClient,
  options: { profile_id: string; permission_id: string; is_grant?: boolean }
): Promise<string> {
  const { profile_id, permission_id, is_grant = true } = options;

  const result = await client.one<{ id: string }>(
    `INSERT INTO constructive_profiles_public.org_profile_definition_grants (profile_id, permission_id, is_grant)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [profile_id, permission_id, is_grant]
  );

  return result.id;
}

/**
 * Create an org profile grant (assign a profile to a membership).
 * Returns the grant ID.
 */
export async function createOrgProfileGrant(
  client: PgTestClient,
  options: { membership_id: string; profile_id: string; entity_id: string; is_grant?: boolean }
): Promise<string> {
  const { membership_id, profile_id, entity_id, is_grant = true } = options;

  const result = await client.one<{ id: string }>(
    `INSERT INTO constructive_profiles_public.org_profile_grants (membership_id, profile_id, entity_id, is_grant)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [membership_id, profile_id, entity_id, is_grant]
  );

  return result.id;
}
