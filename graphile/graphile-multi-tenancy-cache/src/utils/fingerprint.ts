import crypto from 'node:crypto';

/**
 * Minimal introspection types — just enough for fingerprinting.
 * These mirror pg-introspection's types but only include
 * the fields needed for structural comparison.
 */

export interface IntrospectionNamespace {
  nspname: string;
  oid: string;
}

export interface IntrospectionClass {
  relname: string;
  relnamespace: string;
  relkind: string;
}

export interface IntrospectionAttribute {
  attrelid: string;
  attname: string;
  atttypid: string;
  attnum: number;
  attnotnull: boolean;
}

export interface IntrospectionConstraint {
  conname: string;
  conrelid: string;
  contype: string;
  conkey: number[] | null;
  confrelid: string | null;
  confkey: number[] | null;
}

export interface IntrospectionType {
  typname: string;
  typnamespace: string;
  typtype: string;
}

export interface IntrospectionProc {
  proname: string;
  pronamespace: string;
  proargtypes: string;
  prorettype: string;
  provolatile: string;
}

export interface MinimalIntrospection {
  namespaces: IntrospectionNamespace[];
  classes: IntrospectionClass[];
  attributes: IntrospectionAttribute[];
  constraints: IntrospectionConstraint[];
  types: IntrospectionType[];
  procs: IntrospectionProc[];
}

/**
 * Compute a schema-name-agnostic structural fingerprint.
 *
 * Included in fingerprint: table names, column names, data types,
 * constraints, function signatures.
 *
 * Excluded: schema/namespace names, OIDs, instance-specific identifiers.
 * This ensures t_1_services_public.apis and t_2_services_public.apis
 * produce the same fingerprint.
 *
 * @param introspection - Parsed introspection result
 * @param schemaNames - Optional list of schema names to filter by
 * @returns SHA-256 hex string
 */
export function getSchemaFingerprint(
  introspection: MinimalIntrospection,
  schemaNames?: string[],
): string {
  const schemaOids = new Set<string>();

  if (schemaNames && schemaNames.length > 0) {
    const nameSet = new Set(schemaNames);
    for (const ns of introspection.namespaces) {
      if (nameSet.has(ns.nspname)) {
        schemaOids.add(ns.oid);
      }
    }
  } else {
    for (const ns of introspection.namespaces) {
      schemaOids.add(ns.oid);
    }
  }

  // Filter classes to target schemas
  const classes = introspection.classes
    .filter((c) => schemaOids.has(c.relnamespace))
    .sort((a, b) => a.relname.localeCompare(b.relname));

  const classOids = new Set(classes.map((c) => (c as any).oid || c.relname));

  // Normalize tables: name + kind (strip schema)
  const tables = classes.map((c) => `${c.relname}:${c.relkind}`);

  // Normalize columns: tableName.colName:typeOid:notNull:attNum
  const columns = introspection.attributes
    .filter((a) => {
      // Find the class this attribute belongs to
      const cls = introspection.classes.find(
        (c) => ((c as any).oid || c.relname) === a.attrelid,
      );
      return cls && schemaOids.has(cls.relnamespace);
    })
    .sort((a, b) => {
      if (a.attrelid !== b.attrelid) return a.attrelid.localeCompare(b.attrelid);
      return a.attnum - b.attnum;
    })
    .map((a) => {
      const cls = introspection.classes.find(
        (c) => ((c as any).oid || c.relname) === a.attrelid,
      );
      const tableName = cls?.relname || a.attrelid;
      return `${tableName}.${a.attname}:${a.atttypid}:${a.attnotnull}:${a.attnum}`;
    });

  // Normalize constraints: sorted by name, with type and key columns
  const constraints = introspection.constraints
    .filter((c) => {
      const cls = introspection.classes.find(
        (cl) => ((cl as any).oid || cl.relname) === c.conrelid,
      );
      return cls && schemaOids.has(cls.relnamespace);
    })
    .sort((a, b) => a.conname.localeCompare(b.conname))
    .map((c) => {
      const cls = introspection.classes.find(
        (cl) => ((cl as any).oid || cl.relname) === c.conrelid,
      );
      const tableName = cls?.relname || c.conrelid;
      const keys = c.conkey ? c.conkey.sort().join(',') : '';
      const fkeys = c.confkey ? c.confkey.sort().join(',') : '';
      return `${tableName}.${c.conname}:${c.contype}:${keys}:${fkeys}`;
    });

  // Normalize types: name + kind (strip namespace)
  const types = introspection.types
    .filter((t) => schemaOids.has(t.typnamespace))
    .sort((a, b) => a.typname.localeCompare(b.typname))
    .map((t) => `${t.typname}:${t.typtype}`);

  // Normalize procs: name + arg types + return type + volatility (strip namespace)
  const procs = introspection.procs
    .filter((p) => schemaOids.has(p.pronamespace))
    .sort((a, b) => {
      if (a.proname !== b.proname) return a.proname.localeCompare(b.proname);
      return a.proargtypes.localeCompare(b.proargtypes);
    })
    .map((p) => `${p.proname}:${p.proargtypes}:${p.prorettype}:${p.provolatile}`);

  // Build canonical string and hash
  const canonical = [
    `tables:${tables.join('|')}`,
    `columns:${columns.join('|')}`,
    `constraints:${constraints.join('|')}`,
    `types:${types.join('|')}`,
    `procs:${procs.join('|')}`,
  ].join('\n');

  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Compare two fingerprints for equality.
 */
export function fingerprintsMatch(a: string, b: string): boolean {
  return a === b;
}
