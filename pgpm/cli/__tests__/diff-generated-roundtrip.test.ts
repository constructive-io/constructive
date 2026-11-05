/**
 * Seeded round-trip property test for `pgpm diff` against live Postgres.
 *
 * A deterministic generator (fixed seeds, no I/O) produces v1/v2 schema
 * pairs over tables, columns (defaults, NOT NULL, types), PK/FK/CHECK/UNIQUE
 * constraints, indexes, views, functions, triggers, RLS policies, grants,
 * enum types, sequences and comments, with rows in every v1 table. For each
 * seed the emitted migration must take v1 (with rows) to the catalog of a
 * fresh v2, pass its own verify, and revert back to v1's catalog; rows
 * survive (through declared renames too). Seeds rotate through the
 * granularity / change-granularity dials and the emit modes.
 *
 * PREREQUISITES: a running PostgreSQL instance via standard PG* env vars.
 */
import { readBundleArchiveFile } from '@pgpmjs/core';
import { diffCatalogSnapshots, loadModule, snapshotCatalog, withoutColumnOrder } from '@pgpmjs/transform';
import * as fs from 'fs';
import * as path from 'path';
import { teardownPgPools } from 'pg-cache';

import { CLIDeployTestFixture } from '../test-utils';

jest.setTimeout(600000);

afterAll(async () => {
  await teardownPgPools();
});

// Each seed opens three databases; releasing their pools per test keeps the
// connection count flat when jest runs this suite next to the other diff suites.
afterEach(async () => {
  await teardownPgPools();
});

// ---------------------------------------------------------------- generator

/** mulberry32: small, fast, deterministic. */
const prng = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type ColumnType = 'int' | 'bigint' | 'text' | 'varchar' | 'boolean' | 'numeric(10,2)' | 'numeric(12,2)' | 'timestamptz' | 'gen.mood';

interface Column {
  name: string;
  type: ColumnType;
  notNull: boolean;
  def?: string;
  storage?: 'external';
  comment?: string;
}

interface Table {
  name: string;
  columns: Column[];
  fk?: { column: string; ref: string };
  check?: { column: string };
  unique?: string;
  index?: { column: string; unique: boolean; partial: boolean; include: boolean };
  grants: string[];
  policy: boolean;
  trigger: boolean;
  triggerDisabled: boolean;
  comment?: string;
  unlogged: boolean;
  fillfactor?: number;
  identity: boolean;
  viewSecurityInvoker: boolean;
}

interface Schema {
  enumValues: string[];
  seqIncrement: number;
  fnBody: string;
  /** Whether `gen.total(scale int)` exists alongside `gen.total()`. */
  overload: boolean;
  tables: Table[];
}

const pick = <T>(rng: () => number, items: readonly T[]): T => items[Math.floor(rng() * items.length)];

const COLUMN_TYPES: readonly ColumnType[] = ['int', 'bigint', 'text', 'boolean', 'numeric(10,2)', 'timestamptz', 'gen.mood'];

const defaultFor = (type: ColumnType): string => {
  switch (type) {
  case 'int': case 'bigint': return '7';
  case 'text': case 'varchar': return "'x'";
  case 'boolean': return 'true';
  case 'numeric(10,2)': case 'numeric(12,2)': return '1.50';
  case 'timestamptz': return "'2024-01-01 00:00:00+00'";
  case 'gen.mood': return "'a'";
  }
};

const valueFor = (type: ColumnType, i: number): string => {
  switch (type) {
  case 'int': case 'bigint': return String(i + 1);
  case 'text': case 'varchar': return `'v${i}'`;
  case 'boolean': return i % 2 === 0 ? 'true' : 'false';
  case 'numeric(10,2)': case 'numeric(12,2)': return `${i}.25`;
  case 'timestamptz': return `'2024-01-0${i + 1} 00:00:00+00'`;
  case 'gen.mood': return i % 2 === 0 ? "'a'" : "'b'";
  }
};

const makeColumn = (rng: () => number, name: string): Column => {
  const type = pick(rng, COLUMN_TYPES);
  const notNull = rng() < 0.4;
  const def = rng() < 0.5 ? defaultFor(type) : undefined;
  const storage = type === 'text' && rng() < 0.3 ? 'external' as const : undefined;
  const comment = rng() < 0.2 ? `column ${name}` : undefined;
  return { name, type, notNull, def, storage, comment };
};

function generateV1(rng: () => number): Schema {
  const tableCount = 2 + Math.floor(rng() * 2);
  const tables: Table[] = [];
  for (let t = 0; t < tableCount; t++) {
    const columnCount = 2 + Math.floor(rng() * 3);
    const columns: Column[] = [];
    for (let c = 0; c < columnCount; c++) columns.push(makeColumn(rng, `c${c}`));
    const table: Table = {
      name: `t${t}`,
      columns,
      grants: rng() < 0.7 ? ['SELECT'] : [],
      policy: rng() < 0.5,
      trigger: rng() < 0.5,
      triggerDisabled: false,
      comment: rng() < 0.5 ? `table ${t}` : undefined,
      unlogged: false,
      fillfactor: rng() < 0.3 ? 70 : undefined,
      identity: rng() < 0.3,
      viewSecurityInvoker: rng() < 0.3
    };
    if (table.trigger && rng() < 0.3) table.triggerDisabled = true;
    if (t > 0 && rng() < 0.7) {
      columns.push({ name: 'ref_id', type: 'int', notNull: false });
      table.fk = { column: 'ref_id', ref: `t${Math.floor(rng() * t)}` };
    }
    const ints = columns.filter(c => c.type === 'int' && c.name !== 'ref_id');
    if (ints.length > 0 && rng() < 0.6) table.check = { column: pick(rng, ints).name };
    const plain = columns.filter(c => c.name !== 'ref_id');
    const distinct = uniqueSafe(columns);
    if (distinct.length > 0 && rng() < 0.5) table.unique = pick(rng, distinct).name;
    if (rng() < 0.7) {
      const unique = distinct.length > 0 && rng() < 0.3;
      table.index = { column: pick(rng, unique ? distinct : plain).name, unique, partial: rng() < 0.3, include: rng() < 0.3 };
    }
    tables.push(table);
  }
  // A permanent table's FK may only reference a permanent table.
  const referenced = new Set(tables.map(t => t.fk?.ref));
  for (const table of tables) if (!referenced.has(table.name) && rng() < 0.25) table.unlogged = true;
  return { enumValues: ['a', 'b'], seqIncrement: 1, fnBody: 'count(*)', overload: rng() < 0.4, tables };
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

interface Mutation {
  kind: string;
  /** `--rename` declarations the migration needs. */
  renames: string[];
  /** Whether the revert cannot restore the enum (values cannot be removed). */
  enumAppended: boolean;
}

/** Column types whose generated row values are distinct (safe for UNIQUE). */
const UNIQUE_SAFE: readonly ColumnType[] = ['int', 'bigint', 'text', 'varchar', 'numeric(10,2)', 'numeric(12,2)', 'timestamptz'];
const uniqueSafe = (columns: Column[]): Column[] => columns.filter(c => c.name !== 'ref_id' && UNIQUE_SAFE.includes(c.type));

/** Columns a mutation may drop/alter without breaking another object of the table. */
const freeColumns = (table: Table): Column[] =>
  table.columns.filter(
    c => c.name !== 'ref_id' && c.name !== table.check?.column && c.name !== table.unique && c.name !== table.index?.column
  );

function mutate(rng: () => number, v1: Schema): { v2: Schema; mutation: Mutation } {
  const v2 = clone(v1);
  const mutation: Mutation = { kind: '', renames: [], enumAppended: false };
  const ops = [
    'addColumn', 'dropColumn', 'changeDefault', 'toggleNotNull', 'widenType', 'toggleIndex', 'changeFn',
    'togglePolicy', 'changeGrants', 'addEnumValue', 'addTable', 'dropTable', 'toggleCheck', 'changeSeq',
    'toggleTrigger', 'changeComment', 'renameColumn',
    'toggleUnlogged', 'toggleReloptions', 'toggleIdentity', 'toggleTriggerState', 'toggleIndexInclude', 'toggleViewOption',
    'toggleStorage', 'toggleOverload', 'changeColumnComment'
  ] as const;
  const applied: string[] = [];
  let guard = 0;
  while (applied.length < 3 && guard++ < 40) {
    const op = pick(rng, ops);
    if (applied.includes(op)) continue;
    const table = pick(rng, v2.tables);
    const free = freeColumns(table);
    switch (op) {
    case 'addColumn': {
      const col = makeColumn(rng, `n${applied.length}`);
      if (col.notNull && !col.def) col.def = defaultFor(col.type);
      table.columns.push(col);
      break;
    }
    case 'dropColumn': {
      if (free.length < 2) continue;
      const victim = pick(rng, free);
      table.columns = table.columns.filter(c => c !== victim);
      break;
    }
    case 'changeDefault': {
      if (free.length === 0) continue;
      const col = pick(rng, free);
      col.def = col.def ? undefined : defaultFor(col.type);
      break;
    }
    case 'toggleNotNull': {
      if (free.length === 0) continue;
      const col = pick(rng, free);
      col.notNull = !col.notNull;
      break;
    }
    case 'widenType': {
      const widenable = free.filter(c => c.type === 'int' || c.type === 'text' || c.type === 'numeric(10,2)');
      if (widenable.length === 0) continue;
      const col = pick(rng, widenable);
      col.type = col.type === 'int' ? 'bigint' : col.type === 'text' ? 'varchar' : 'numeric(12,2)';
      break;
    }
    case 'toggleIndex': {
      if (table.index) {
        const flippable = UNIQUE_SAFE.includes(table.columns.find(c => c.name === table.index!.column)?.type ?? 'boolean');
        table.index = rng() < 0.5 || !flippable ? undefined : { ...table.index, unique: !table.index.unique };
      } else if (free.length > 0) table.index = { column: pick(rng, free).name, unique: false, partial: true, include: false };
      else continue;
      break;
    }
    case 'changeFn': v2.fnBody = v2.fnBody === 'count(*)' ? 'count(1)' : 'count(*)'; break;
    case 'togglePolicy': table.policy = !table.policy; break;
    case 'changeGrants': table.grants = table.grants.length === 0 ? ['SELECT'] : table.grants.length === 1 ? ['SELECT', 'INSERT'] : []; break;
    case 'addEnumValue': v2.enumValues = [...v2.enumValues, 'c']; mutation.enumAppended = true; break;
    case 'addTable': {
      const t: Table = {
        name: `t${v2.tables.length}`,
        columns: [makeColumn(rng, 'c0'), { name: 'ref_id', type: 'int', notNull: false }],
        fk: { column: 'ref_id', ref: v2.tables[0].name },
        grants: ['SELECT'], policy: false, trigger: false, triggerDisabled: false,
        unlogged: v2.tables[0].unlogged, identity: false, viewSecurityInvoker: false
      };
      v2.tables.push(t);
      break;
    }
    case 'dropTable': {
      const referenced = new Set(v2.tables.map(t => t.fk?.ref).filter(Boolean));
      const droppable = v2.tables.filter(t => !referenced.has(t.name));
      if (droppable.length === 0 || v2.tables.length < 2) continue;
      const victim = pick(rng, droppable);
      v2.tables = v2.tables.filter(t => t !== victim);
      break;
    }
    case 'toggleCheck': {
      if (table.check) table.check = undefined;
      else {
        const ints = free.filter(c => c.type === 'int');
        if (ints.length === 0) continue;
        table.check = { column: pick(rng, ints).name };
      }
      break;
    }
    case 'changeSeq': v2.seqIncrement = v2.seqIncrement === 1 ? 5 : 1; break;
    case 'toggleTrigger': table.trigger = !table.trigger; break;
    case 'changeComment': table.comment = table.comment ? undefined : 'changed'; break;
    case 'renameColumn': {
      if (free.length === 0) continue;
      const col = pick(rng, free);
      const from = col.name;
      col.name = `${from}_renamed`;
      mutation.renames.push(`gen.${table.name}.${from}=gen.${table.name}.${col.name}`);
      break;
    }
    case 'toggleUnlogged': {
      if (v2.tables.some(t => t.fk?.ref === table.name)) continue;
      table.unlogged = !table.unlogged;
      break;
    }
    case 'toggleReloptions': table.fillfactor = table.fillfactor ? undefined : 70; break;
    case 'toggleIdentity': table.identity = !table.identity; break;
    case 'toggleTriggerState': {
      if (!table.trigger) continue;
      table.triggerDisabled = !table.triggerDisabled;
      break;
    }
    case 'toggleIndexInclude': {
      if (!table.index) continue;
      table.index.include = !table.index.include;
      break;
    }
    case 'toggleViewOption': table.viewSecurityInvoker = !table.viewSecurityInvoker; break;
    case 'toggleStorage': {
      const texts = free.filter(c => c.type === 'text' || c.type === 'varchar');
      if (texts.length === 0) continue;
      const col = pick(rng, texts);
      col.storage = col.storage ? undefined : 'external';
      break;
    }
    case 'toggleOverload': v2.overload = !v2.overload; break;
    case 'changeColumnComment': {
      if (free.length === 0) continue;
      const col = pick(rng, free);
      col.comment = col.comment ? undefined : 'changed';
      break;
    }
    }
    applied.push(op);
  }
  mutation.kind = applied.join('+');
  return { v2, mutation };
}

function renderSql(schema: Schema): string {
  const out: string[] = ['CREATE SCHEMA gen;'];
  out.push(`CREATE TYPE gen.mood AS ENUM (${schema.enumValues.map(v => `'${v}'`).join(', ')});`);
  out.push(`CREATE SEQUENCE gen.seq INCREMENT ${schema.seqIncrement};`);
  schema.tables.forEach((table, i) => {
    const cols = [`  id int${table.identity ? ' GENERATED BY DEFAULT AS IDENTITY' : ''} PRIMARY KEY`];
    for (const c of table.columns) {
      cols.push(`  ${c.name} ${c.type}${c.notNull ? ' NOT NULL' : ''}${c.def ? ` DEFAULT ${c.def}` : ''}`);
    }
    if (i === 0) cols.push(`  seq_no bigint DEFAULT nextval('gen.seq')`);
    if (table.fk) cols.push(`  CONSTRAINT ${table.name}_ref_fk FOREIGN KEY (${table.fk.column}) REFERENCES gen.${table.fk.ref} (id)`);
    if (table.check) cols.push(`  CONSTRAINT ${table.name}_${table.check.column}_pos CHECK (${table.check.column} > 0)`);
    if (table.unique) cols.push(`  CONSTRAINT ${table.name}_${table.unique}_key UNIQUE (${table.unique})`);
    const withClause = table.fillfactor ? ` WITH (fillfactor = ${table.fillfactor})` : '';
    out.push(`CREATE ${table.unlogged ? 'UNLOGGED ' : ''}TABLE gen.${table.name} (\n${cols.join(',\n')}\n)${withClause};`);
    for (const c of table.columns) {
      if (c.storage) out.push(`ALTER TABLE gen.${table.name} ALTER COLUMN ${c.name} SET STORAGE ${c.storage};`);
      if (c.comment) out.push(`COMMENT ON COLUMN gen.${table.name}.${c.name} IS '${c.comment}';`);
    }
    if (table.index) {
      const include = table.index.include ? ' INCLUDE (id)' : '';
      out.push(`CREATE ${table.index.unique ? 'UNIQUE ' : ''}INDEX ${table.name}_${table.index.column}_idx ON gen.${table.name} (${table.index.column})${include}${table.index.partial ? ' WHERE id > 0' : ''};`);
    }
    if (table.comment) out.push(`COMMENT ON TABLE gen.${table.name} IS '${table.comment}';`);
    if (table.grants.length > 0) out.push(`GRANT ${table.grants.join(', ')} ON gen.${table.name} TO PUBLIC;`);
    if (table.policy) {
      out.push(`ALTER TABLE gen.${table.name} ENABLE ROW LEVEL SECURITY;`);
      out.push(`CREATE POLICY ${table.name}_read ON gen.${table.name} FOR SELECT USING (true);`);
    }
    const viewOptions = table.viewSecurityInvoker ? ' WITH (security_invoker = true)' : '';
    out.push(`CREATE VIEW gen.${table.name}_v${viewOptions} AS SELECT id${table.columns.map(c => `, ${c.name}`).join('')} FROM gen.${table.name};`);
    if (table.trigger) {
      out.push(`CREATE FUNCTION gen.${table.name}_touch() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;`);
      out.push(`CREATE TRIGGER ${table.name}_touch BEFORE INSERT ON gen.${table.name} FOR EACH ROW EXECUTE FUNCTION gen.${table.name}_touch();`);
      if (table.triggerDisabled) out.push(`ALTER TABLE gen.${table.name} DISABLE TRIGGER ${table.name}_touch;`);
    }
  });
  out.push(`CREATE FUNCTION gen.total() RETURNS bigint LANGUAGE sql AS $$ SELECT ${schema.fnBody} FROM gen.${schema.tables[0].name} $$;`);
  if (schema.overload) {
    out.push(`CREATE FUNCTION gen.total(scale int) RETURNS bigint LANGUAGE sql AS $$ SELECT ${schema.fnBody} * scale FROM gen.${schema.tables[0].name} $$;`);
  }
  return out.join('\n');
}

function renderRows(schema: Schema): string {
  const out: string[] = [];
  schema.tables.forEach(table => {
    for (let i = 0; i < 3; i++) {
      const names = ['id', ...table.columns.map(c => c.name)];
      const values = [String(i + 1), ...table.columns.map(c => (c.name === 'ref_id' ? '1' : valueFor(c.type, i)))];
      out.push(`INSERT INTO gen.${table.name} (${names.join(', ')}) VALUES (${values.join(', ')});`);
    }
  });
  return out.join('\n');
}

// ---------------------------------------------------------------- harness

const writeModule = (moduleDir: string, name: string, sql: string) => {
  for (const dir of ['deploy', 'revert', 'verify']) fs.mkdirSync(path.join(moduleDir, dir), { recursive: true });
  fs.writeFileSync(
    path.join(moduleDir, 'pgpm.plan'),
    `%syntax-version=1.0.0\n%project=${name}\n%uri=https://github.com/test/${name}\n\ninit 2024-01-01T00:00:00Z test <test@example.com> # add init\n`
  );
  fs.writeFileSync(path.join(moduleDir, `${name}.control`), `comment = 'generated'\ndefault_version = '0.0.1'\nrelocatable = false\nsuperuser = false\n`);
  fs.writeFileSync(path.join(moduleDir, 'deploy', 'init.sql'), `-- Deploy init to pg\n\nBEGIN;\n\n${sql}\n\nCOMMIT;\n`);
  fs.writeFileSync(path.join(moduleDir, 'revert', 'init.sql'), `-- Revert init from pg\n\nBEGIN;\n\nDROP SCHEMA gen CASCADE;\n\nCOMMIT;\n`);
  fs.writeFileSync(path.join(moduleDir, 'verify', 'init.sql'), `-- Verify init on pg\n\nBEGIN;\n\nROLLBACK;\n`);
};

const WS = 'gen-ws';
const SEEDS = [11, 22, 33, 44, 55, 66, 77, 88, 99, 111, 122, 133, 144, 155, 166, 177];
const DIALS: [string, string][] = [
  ['object', 'object'],
  ['atomic', 'alteration'],
  ['consolidated', 'single'],
  ['object', 'alteration'],
  ['atomic', 'object'],
  ['consolidated', 'object']
];

describe('pgpm diff e2e: seeded round-trip', () => {
  let fixture: CLIDeployTestFixture;
  let wsDir: string;

  beforeAll(async () => {
    await loadModule();
    fixture = new CLIDeployTestFixture();
    wsDir = path.join(fixture.tempFixtureDir, WS);
    fs.mkdirSync(wsDir, { recursive: true });
    fs.writeFileSync(path.join(wsDir, 'pgpm.json'), '{\n    "packages": [\n        "*"\n    ]\n}');
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it('generates deterministically from a seed', () => {
    const a = generateV1(prng(7));
    const b = generateV1(prng(7));
    expect(renderSql(a)).toEqual(renderSql(b));
    expect(mutate(prng(8), a).mutation.kind).toEqual(mutate(prng(8), b).mutation.kind);
  });

  SEEDS.forEach((seed, index) => {
    const [granularity, changeGranularity] = DIALS[index % DIALS.length];
    it(`seed ${seed} (${granularity}/${changeGranularity}): v1 + migration == v2, verify passes, revert == v1, rows kept`, async () => {
      const rng = prng(seed);
      const v1 = generateV1(rng);
      const { v2, mutation } = mutate(rng, v1);
      const v1Name = `gen-v1-${seed}`;
      const v2Name = `gen-v2-${seed}`;
      const pkg = `gen-mig-${seed}`;
      writeModule(path.join(wsDir, v1Name), v1Name, renderSql(v1));
      writeModule(path.join(wsDir, v2Name), v2Name, renderSql(v2));

      const v1Db = await fixture.setupTestDatabase();
      const v2Db = await fixture.setupTestDatabase();
      const testDb = await fixture.setupTestDatabase();
      await fixture.runTerminalCommands(`
        cd ${WS}/${v1Name}
        pgpm deploy --database ${v1Db.name} --package ${v1Name} --yes
        pgpm deploy --database ${testDb.name} --package ${v1Name} --yes
        cd ../${v2Name}
        pgpm deploy --database ${v2Db.name} --package ${v2Name} --yes
      `, {});
      await testDb.query(renderRows(v1));
      const before = await testDb.query(`SELECT count(*)::int AS n FROM gen.${v1.tables[0].name}`);

      const emit = index === 0 ? ` --emit-sql ${pkg}.sql --emit-bundle ${pkg}.bundle.tar.gz` : '';
      const renames = mutation.renames.map(r => ` --rename ${r}`).join('');
      await fixture.runTerminalCommands(`
        cd ${WS}
        pgpm diff ${v1Name} ${v2Name} --emit-migration . --pkg ${pkg} --granularity ${granularity} --change-granularity ${changeGranularity} --allow-data-loss --allow-incomplete${renames}${emit}
      `, {});
      expect(fs.existsSync(path.join(wsDir, pkg, 'pgpm.plan'))).toBe(true);
      if (emit) {
        expect(fs.readFileSync(path.join(wsDir, `${pkg}.sql`), 'utf-8').length).toBeGreaterThan(0);
        expect(readBundleArchiveFile(path.join(wsDir, `${pkg}.bundle.tar.gz`)).changes.length).toBeGreaterThan(0);
      }

      await fixture.runTerminalCommands(`
        cd ${WS}/${pkg}
        pgpm deploy --database ${testDb.name} --package ${pkg} --yes
      `, {});
      const migrated = await snapshotCatalog(testDb);
      const fresh = await snapshotCatalog(v2Db);
      expect({ seed, mutation: mutation.kind, diffs: diffCatalogSnapshots(withoutColumnOrder(migrated), withoutColumnOrder(fresh)) })
        .toEqual({ seed, mutation: mutation.kind, diffs: [] });
      // Rows survive (the first table is never dropped: everything may reference it).
      if (v2.tables.some(t => t.name === v1.tables[0].name)) {
        const after = await testDb.query(`SELECT count(*)::int AS n FROM gen.${v1.tables[0].name}`);
        expect(after.rows[0].n).toBe(before.rows[0].n);
      }

      await fixture.runTerminalCommands(`
        cd ${WS}/${pkg}
        pgpm verify --database ${testDb.name} --package ${pkg} --yes
        pgpm revert --database ${testDb.name} --package ${pkg} --yes --no-recursive
      `, {});
      const reverted = await snapshotCatalog(testDb);
      const original = await snapshotCatalog(v1Db);
      const residual = diffCatalogSnapshots(withoutColumnOrder(reverted), withoutColumnOrder(original));
      const expected = mutation.enumAppended ? [expect.stringMatching(/types: gen\.mood differs/)] : [];
      expect({ seed, mutation: mutation.kind, residual }).toEqual({ seed, mutation: mutation.kind, residual: expected });
    });
  });
});
