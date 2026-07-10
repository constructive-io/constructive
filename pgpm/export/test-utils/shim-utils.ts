import { META_TABLE_CONFIG } from '../src/export-utils';

/**
 * Generates CREATE TABLE IF NOT EXISTS statements for every table in
 * META_TABLE_CONFIG so strict export flows (which throw on missing tables)
 * can run against minimal test databases. Hand-written shims with real
 * columns take precedence because of IF NOT EXISTS.
 */
export const buildMetaTableShimsSQL = (): string => {
  const stmts: string[] = [];
  const schemas = new Set<string>();
  for (const cfg of Object.values(META_TABLE_CONFIG)) {
    schemas.add(cfg.schema);
  }
  for (const schema of schemas) {
    stmts.push(`CREATE SCHEMA IF NOT EXISTS ${schema};`);
  }
  for (const cfg of Object.values(META_TABLE_CONFIG)) {
    stmts.push(
      `CREATE TABLE IF NOT EXISTS ${cfg.schema}."${cfg.table}" (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), database_id uuid);`
    );
  }
  return stmts.join('\n');
};
