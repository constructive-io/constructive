import type { PgTestClient } from 'pgsql-test';
import { uniqueName } from './identifiers';
import { toJsonbModules, ModuleEntry } from './presets';

export interface ProvisionDatabaseOptions {
  name?: string;
  owner_id: string;
  modules: string | readonly ModuleEntry[];
  subdomain?: string;
}

/**
 * Provision a new logical database with the given modules.
 *
 * Calls constructive_control.provision_database() which:
 * 1. Creates the database row in metaschema_public.database
 * 2. Runs all module generators for each specified module
 * 3. Creates schemas, tables, triggers, RLS policies, etc.
 *
 * Returns the database_id.
 */
export async function provisionDatabase(
  pg: PgTestClient,
  opts: ProvisionDatabaseOptions
): Promise<string> {
  const name = opts.name ?? uniqueName('test_db');
  const modules = typeof opts.modules === 'string'
    ? opts.modules
    : toJsonbModules(opts.modules);

  const result = await pg.one<{ provision_database: string }>(
    `SELECT constructive_control.provision_database(
       name := $1,
       owner_id := $2,
       modules := $3::jsonb,
       subdomain := $4
     )`,
    [name, opts.owner_id, modules, opts.subdomain ?? name]
  );

  return result.provision_database;
}

export interface ConstructBlueprintOptions {
  name?: string;
  owner_id: string;
  modules: string | readonly ModuleEntry[];
  subdomain?: string;
  entity_types?: object[];
}

/**
 * Provision a database using the full blueprint system.
 *
 * This is the higher-level API that supports entity_types (organizations,
 * teams, etc.) with their own module sets + storage arrays.
 *
 * Returns the database_id.
 */
export async function constructBlueprint(
  pg: PgTestClient,
  opts: ConstructBlueprintOptions
): Promise<string> {
  const name = opts.name ?? uniqueName('test_db');
  const modules = typeof opts.modules === 'string'
    ? opts.modules
    : toJsonbModules(opts.modules);

  const blueprint: Record<string, unknown> = {
    name,
    owner_id: opts.owner_id,
    modules: JSON.parse(modules),
    subdomain: opts.subdomain ?? name,
  };

  if (opts.entity_types) {
    blueprint.entity_types = opts.entity_types;
  }

  const result = await pg.one<{ construct_blueprint: string }>(
    `SELECT constructive_control.construct_blueprint($1::jsonb)`,
    [JSON.stringify(blueprint)]
  );

  return result.construct_blueprint;
}
