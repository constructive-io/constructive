import type { PgTestClient } from 'pgsql-test';

export interface BlueprintConstructionResult {
  construction_id: string;
  table_map: Record<string, string>;
}

/**
 * Insert a blueprint and construct it against a schema.
 * Returns the construction_id and table_map (table_name -> table_id).
 *
 * On failure, surfaces error_details from the construction row.
 */
export async function constructBlueprint(
  pg: PgTestClient,
  options: {
    owner_id: string;
    database_id: string;
    schema_id: string;
    name: string;
    display_name: string;
    definition: string;
  }
): Promise<BlueprintConstructionResult> {
  const { owner_id, database_id, schema_id, name, display_name, definition } = options;

  const bp = await pg.one<{ id: string }>(
    `INSERT INTO metaschema_modules_public.blueprint
      (owner_id, database_id, name, display_name, definition)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id`,
    [owner_id, database_id, name, display_name, definition]
  );

  const result = await pg.one<{ construct_blueprint: string | null }>(
    `SELECT metaschema_modules_public.construct_blueprint(
      blueprint_id := $1,
      schema_id := $2
     )`,
    [bp.id, schema_id]
  );

  if (!result.construct_blueprint) {
    const status = await pg.oneOrNone<{ status: string; error_details: string }>(
      `SELECT status, error_details FROM metaschema_modules_public.blueprint_construction WHERE blueprint_id = $1`,
      [bp.id]
    );
    throw new Error(`construct_blueprint failed for '${name}': ${status?.error_details || 'unknown error'}`);
  }

  const construction_id = result.construct_blueprint;
  const { table_map } = await pg.one<{ table_map: Record<string, string> }>(
    `SELECT table_map FROM metaschema_modules_public.blueprint_construction WHERE id = $1`,
    [construction_id]
  );

  return { construction_id, table_map };
}

/**
 * Get the construction status for a blueprint construction.
 */
export async function getConstructionStatus(
  pg: PgTestClient,
  construction_id: string
): Promise<string> {
  const result = await pg.one<{ status: string }>(
    `SELECT status FROM metaschema_modules_public.blueprint_construction WHERE id = $1`,
    [construction_id]
  );
  return result.status;
}
