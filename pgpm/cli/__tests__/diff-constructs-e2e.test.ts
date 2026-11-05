/**
 * e2e for `pgpm diff` over real-world PostgreSQL constructs mined from the
 * pgsql-parser fixtures (kitchen-sink + upstream regression SQL): partitions,
 * inheritance, exclusion constraints, index variants, generated columns,
 * trigger variants, event triggers, policies, domains, range types,
 * collations, extensions, operators, casts, aggregates, procedures, function
 * variants, view options, identifiers, defaults, storage, reloptions,
 * sequences, identity columns and comments. Each case deploys v1 (with rows
 * where it matters), deploys the emitted migration, must reach the catalog
 * of a fresh v2, and must revert back to the catalog of v1.
 *
 * PREREQUISITES: a running PostgreSQL instance via standard PG* env vars.
 */
import { diffCatalogSnapshots, loadModule, snapshotCatalog, withoutColumnOrder } from '@pgpmjs/transform';
import * as fs from 'fs';
import * as path from 'path';
import { teardownPgPools } from 'pg-cache';

import { CLIDeployTestFixture } from '../test-utils';

jest.setTimeout(240000);

afterAll(async () => {
  await teardownPgPools();
});

const WS = 'cx-ws';

const writeModule = (moduleDir: string, name: string, sql: string, revert: string) => {
  fs.mkdirSync(path.join(moduleDir, 'deploy'), { recursive: true });
  fs.mkdirSync(path.join(moduleDir, 'revert'), { recursive: true });
  fs.mkdirSync(path.join(moduleDir, 'verify'), { recursive: true });
  fs.writeFileSync(
    path.join(moduleDir, 'pgpm.plan'),
    `%syntax-version=1.0.0\n%project=${name}\n%uri=https://github.com/test/${name}\n\ninit 2024-01-01T00:00:00Z test <test@example.com> # add init\n`
  );
  fs.writeFileSync(
    path.join(moduleDir, `${name}.control`),
    `comment = 'Diff constructs e2e module'\ndefault_version = '0.0.1'\nrelocatable = false\nsuperuser = false\n`
  );
  fs.writeFileSync(path.join(moduleDir, 'deploy', 'init.sql'), `-- Deploy init to pg\n\nBEGIN;\n\n${sql}\n\nCOMMIT;\n`);
  fs.writeFileSync(path.join(moduleDir, 'revert', 'init.sql'), `-- Revert init from pg\n\nBEGIN;\n\n${revert}\nDROP SCHEMA fx CASCADE;\n\nCOMMIT;\n`);
  fs.writeFileSync(path.join(moduleDir, 'verify', 'init.sql'), `-- Verify init on pg\n\nBEGIN;\n\nROLLBACK;\n`);
};

interface Case {
  name: string;
  v1: string;
  v2: string;
  flags?: string;
  rows?: string;
  /** Extra revert statements for objects outside schema fx (extensions, event triggers, casts). */
  revert?: string;
  /** Cluster-level roles the case references; created by the test before deploying. */
  roles?: string[];
  /** Row check after the forward migration: query and expected rows. */
  check?: { sql: string; rows: Record<string, unknown>[] };
  deployed?: RegExp[];
  notDeployed?: RegExp[];
  forwardResidual?: RegExp[];
  revertResidual?: RegExp[];
}

const S = 'CREATE SCHEMA fx;';

export const CASES: Case[] = [
  // ---- partitioned tables
  {
    name: 'partition-add',
    v1: `${S} CREATE TABLE fx.m (id int NOT NULL, k int NOT NULL, PRIMARY KEY (id, k)) PARTITION BY LIST (k); CREATE TABLE fx.m_1 PARTITION OF fx.m FOR VALUES IN (1);`,
    v2: `${S} CREATE TABLE fx.m (id int NOT NULL, k int NOT NULL, PRIMARY KEY (id, k)) PARTITION BY LIST (k); CREATE TABLE fx.m_1 PARTITION OF fx.m FOR VALUES IN (1); CREATE TABLE fx.m_2 PARTITION OF fx.m FOR VALUES IN (2);`,
    rows: 'INSERT INTO fx.m VALUES (1, 1)',
    check: { sql: 'SELECT id, k FROM fx.m ORDER BY id', rows: [{ id: 1, k: 1 }] }
  },
  {
    name: 'partition-drop',
    v1: `${S} CREATE TABLE fx.m (id int NOT NULL, k int NOT NULL) PARTITION BY RANGE (k); CREATE TABLE fx.m_a PARTITION OF fx.m FOR VALUES FROM (0) TO (10); CREATE TABLE fx.m_b PARTITION OF fx.m FOR VALUES FROM (10) TO (20);`,
    v2: `${S} CREATE TABLE fx.m (id int NOT NULL, k int NOT NULL) PARTITION BY RANGE (k); CREATE TABLE fx.m_a PARTITION OF fx.m FOR VALUES FROM (0) TO (10);`,
    flags: '--allow-data-loss'
  },
  {
    name: 'partition-bound-change',
    v1: `${S} CREATE TABLE fx.m (id int NOT NULL, k int NOT NULL) PARTITION BY RANGE (k); CREATE TABLE fx.m_a PARTITION OF fx.m FOR VALUES FROM (0) TO (10);`,
    v2: `${S} CREATE TABLE fx.m (id int NOT NULL, k int NOT NULL) PARTITION BY RANGE (k); CREATE TABLE fx.m_a PARTITION OF fx.m FOR VALUES FROM (0) TO (20);`,
    rows: 'INSERT INTO fx.m VALUES (1, 5)',
    check: { sql: 'SELECT id, k FROM fx.m ORDER BY id', rows: [{ id: 1, k: 5 }] }
  },
  {
    name: 'partition-default-and-hash',
    v1: `${S} CREATE TABLE fx.h (id int NOT NULL) PARTITION BY HASH (id); CREATE TABLE fx.h_0 PARTITION OF fx.h FOR VALUES WITH (MODULUS 2, REMAINDER 0); CREATE TABLE fx.h_1 PARTITION OF fx.h FOR VALUES WITH (MODULUS 2, REMAINDER 1);`,
    v2: `${S} CREATE TABLE fx.h (id int NOT NULL) PARTITION BY HASH (id); CREATE TABLE fx.h_0 PARTITION OF fx.h FOR VALUES WITH (MODULUS 2, REMAINDER 0); CREATE TABLE fx.h_1 PARTITION OF fx.h FOR VALUES WITH (MODULUS 2, REMAINDER 1); CREATE TABLE fx.l (id int NOT NULL, k text) PARTITION BY LIST (k); CREATE TABLE fx.l_d PARTITION OF fx.l DEFAULT;`
  },
  {
    name: 'partition-add-column-to-parent',
    v1: `${S} CREATE TABLE fx.m (id int NOT NULL, k int NOT NULL) PARTITION BY LIST (k); CREATE TABLE fx.m_1 PARTITION OF fx.m FOR VALUES IN (1);`,
    v2: `${S} CREATE TABLE fx.m (id int NOT NULL, k int NOT NULL, note text) PARTITION BY LIST (k); CREATE TABLE fx.m_1 PARTITION OF fx.m FOR VALUES IN (1);`,
    rows: 'INSERT INTO fx.m VALUES (1, 1)',
    check: { sql: 'SELECT id, k, note FROM fx.m ORDER BY id', rows: [{ id: 1, k: 1, note: null }] }
  },
  // ---- inheritance
  {
    name: 'inherits-add-child',
    v1: `${S} CREATE TABLE fx.base (id int PRIMARY KEY, kind text);`,
    v2: `${S} CREATE TABLE fx.base (id int PRIMARY KEY, kind text); CREATE TABLE fx.child (extra text) INHERITS (fx.base);`
  },
  {
    name: 'inherits-parent-column-add',
    v1: `${S} CREATE TABLE fx.base (id int PRIMARY KEY); CREATE TABLE fx.child (extra text) INHERITS (fx.base);`,
    v2: `${S} CREATE TABLE fx.base (id int PRIMARY KEY, kind text); CREATE TABLE fx.child (extra text) INHERITS (fx.base);`,
    rows: "INSERT INTO fx.child VALUES (1, 'e')",
    check: { sql: 'SELECT id, kind, extra FROM fx.child', rows: [{ id: 1, kind: null, extra: 'e' }] }
  },
  // ---- constraints
  {
    name: 'exclusion-constraint',
    v1: `${S} CREATE TABLE fx.r (id int PRIMARY KEY, during int4range NOT NULL);`,
    v2: `${S} CREATE TABLE fx.r (id int PRIMARY KEY, during int4range NOT NULL, CONSTRAINT r_no_overlap EXCLUDE USING gist (during WITH &&));`,
    rows: "INSERT INTO fx.r VALUES (1, '[1,5)')"
  },
  {
    name: 'check-no-inherit-and-not-valid',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, n int);`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, n int, CONSTRAINT n_pos CHECK (n > 0) NO INHERIT);`,
    rows: 'INSERT INTO fx.t VALUES (1, 3)'
  },
  {
    name: 'fk-actions-change',
    v1: `${S} CREATE TABLE fx.p (id int PRIMARY KEY); CREATE TABLE fx.c (id int PRIMARY KEY, p_id int REFERENCES fx.p (id));`,
    v2: `${S} CREATE TABLE fx.p (id int PRIMARY KEY); CREATE TABLE fx.c (id int PRIMARY KEY, p_id int REFERENCES fx.p (id) ON DELETE CASCADE ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED);`,
    rows: 'INSERT INTO fx.p VALUES (1); INSERT INTO fx.c VALUES (1, 1)'
  },
  {
    name: 'fk-match-full-composite',
    v1: `${S} CREATE TABLE fx.p (a int, b int, PRIMARY KEY (a, b)); CREATE TABLE fx.c (id int PRIMARY KEY, a int, b int);`,
    v2: `${S} CREATE TABLE fx.p (a int, b int, PRIMARY KEY (a, b)); CREATE TABLE fx.c (id int PRIMARY KEY, a int, b int, FOREIGN KEY (a, b) REFERENCES fx.p (a, b) MATCH FULL);`
  },
  {
    name: 'unique-nulls-not-distinct',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, code text UNIQUE);`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, code text UNIQUE NULLS NOT DISTINCT);`
  },
  {
    name: 'named-not-null-constraint',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, n int);`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, n int CONSTRAINT t_n_nn NOT NULL);`,
    rows: 'INSERT INTO fx.t VALUES (1, 1)'
  },
  // ---- indexes
  {
    name: 'index-partial-expression-include',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, name text, active boolean, score int); CREATE INDEX t_name_idx ON fx.t (name);`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, name text, active boolean, score int); CREATE INDEX t_name_idx ON fx.t (lower(name)) INCLUDE (score) WHERE active;`
  },
  {
    name: 'index-opclass-collation-order',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, name text, n int);`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, name text, n int); CREATE INDEX t_name_pat ON fx.t (name COLLATE "C" text_pattern_ops, n DESC NULLS LAST); CREATE UNIQUE INDEX t_n_uq ON fx.t (n) WITH (fillfactor = 70);`
  },
  {
    name: 'index-method-gin-brin',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, tags text[], ts timestamptz);`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, tags text[], ts timestamptz); CREATE INDEX t_tags ON fx.t USING gin (tags); CREATE INDEX t_ts ON fx.t USING brin (ts);`
  },
  // ---- generated columns
  {
    name: 'generated-column-add-change-drop',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, a int, b int, s int GENERATED ALWAYS AS (a + b) STORED);`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, a int, b int, s int GENERATED ALWAYS AS (a * b) STORED, d int GENERATED ALWAYS AS (a - b) STORED);`,
    flags: '--allow-data-loss',
    rows: 'INSERT INTO fx.t (id, a, b) VALUES (1, 2, 3)',
    check: { sql: 'SELECT id, s, d FROM fx.t', rows: [{ id: 1, s: 6, d: -1 }] }
  },
  {
    name: 'generated-virtual-pg18',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, a int);`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, a int, v int GENERATED ALWAYS AS (a * 2) VIRTUAL);`,
    rows: 'INSERT INTO fx.t VALUES (1, 4)',
    check: { sql: 'SELECT id, v FROM fx.t', rows: [{ id: 1, v: 8 }] }
  },
  // ---- triggers
  {
    name: 'trigger-when-and-transition-tables',
    v1: [
      S, 'CREATE TABLE fx.t (id int PRIMARY KEY, n int); CREATE TABLE fx.log (n int);',
      'CREATE FUNCTION fx.tg() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO fx.log SELECT NEW.n; RETURN NEW; END $$;',
      'CREATE TRIGGER t_tg AFTER UPDATE ON fx.t FOR EACH ROW EXECUTE FUNCTION fx.tg();'
    ].join('\n'),
    v2: [
      S, 'CREATE TABLE fx.t (id int PRIMARY KEY, n int); CREATE TABLE fx.log (n int);',
      'CREATE FUNCTION fx.tg() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO fx.log SELECT n FROM newrows; RETURN NULL; END $$;',
      'CREATE TRIGGER t_tg AFTER UPDATE ON fx.t REFERENCING NEW TABLE AS newrows FOR EACH STATEMENT WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION fx.tg();'
    ].join('\n')
  },
  {
    name: 'constraint-trigger-deferrable',
    v1: [S, 'CREATE TABLE fx.t (id int PRIMARY KEY); CREATE FUNCTION fx.tg() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;'].join('\n'),
    v2: [S, 'CREATE TABLE fx.t (id int PRIMARY KEY); CREATE FUNCTION fx.tg() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;',
      'CREATE CONSTRAINT TRIGGER t_ct AFTER INSERT ON fx.t DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fx.tg();'].join('\n')
  },
  {
    name: 'trigger-instead-of-view-and-truncate',
    v1: [S, 'CREATE TABLE fx.t (id int PRIMARY KEY); CREATE VIEW fx.v AS SELECT id FROM fx.t; CREATE FUNCTION fx.tg() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;'].join('\n'),
    v2: [S, 'CREATE TABLE fx.t (id int PRIMARY KEY); CREATE VIEW fx.v AS SELECT id FROM fx.t; CREATE FUNCTION fx.tg() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;',
      'CREATE TRIGGER v_io INSTEAD OF INSERT ON fx.v FOR EACH ROW EXECUTE FUNCTION fx.tg();',
      'CREATE TRIGGER t_trunc AFTER TRUNCATE ON fx.t FOR EACH STATEMENT EXECUTE FUNCTION fx.tg();',
      'ALTER TABLE fx.t DISABLE TRIGGER t_trunc;'].join('\n')
  },
  {
    name: 'event-trigger',
    v1: `${S} CREATE FUNCTION fx.evt() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN NULL; END $$;`,
    v2: `${S} CREATE FUNCTION fx.evt() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN NULL; END $$; CREATE EVENT TRIGGER fx_evt ON ddl_command_end WHEN TAG IN ('CREATE TABLE') EXECUTE FUNCTION fx.evt();`,
    revert: 'DROP EVENT TRIGGER IF EXISTS fx_evt;'
  },
  // ---- policies
  {
    name: 'policy-restrictive-roles-check',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, owner text); ALTER TABLE fx.t ENABLE ROW LEVEL SECURITY; CREATE POLICY p ON fx.t FOR SELECT USING (owner = current_user);`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, owner text); ALTER TABLE fx.t ENABLE ROW LEVEL SECURITY; ALTER TABLE fx.t FORCE ROW LEVEL SECURITY; CREATE POLICY p ON fx.t AS RESTRICTIVE FOR ALL TO PUBLIC USING (owner = current_user) WITH CHECK (owner IS NOT NULL);`
  },
  {
    name: 'policy-command-change-and-second-policy',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY); ALTER TABLE fx.t ENABLE ROW LEVEL SECURITY; CREATE POLICY p ON fx.t FOR INSERT TO fx_role WITH CHECK (true);`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY); ALTER TABLE fx.t ENABLE ROW LEVEL SECURITY; CREATE POLICY p ON fx.t FOR UPDATE TO fx_role USING (id > 0); CREATE POLICY q ON fx.t FOR DELETE USING (false);`,
    revert: 'DROP OWNED BY fx_role; DROP ROLE IF EXISTS fx_role;'
  },
  // ---- types
  {
    name: 'domain-multi-constraints',
    v1: `${S} CREATE DOMAIN fx.email AS text CHECK (VALUE ~ '@'); CREATE TABLE fx.t (id int PRIMARY KEY, e fx.email);`,
    v2: `${S} CREATE DOMAIN fx.email AS text NOT NULL DEFAULT 'a@b' CONSTRAINT email_at CHECK (VALUE ~ '@') CONSTRAINT email_len CHECK (length(VALUE) < 100) COLLATE "C"; CREATE TABLE fx.t (id int PRIMARY KEY, e fx.email);`,
    flags: '--allow-data-loss'
  },
  {
    name: 'range-and-multirange-type',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY);`,
    v2: `${S} CREATE TYPE fx.floatrange AS RANGE (subtype = float8, subtype_diff = float8mi, multirange_type_name = fx.floatmultirange); CREATE TABLE fx.t (id int PRIMARY KEY, r fx.floatrange, mr fx.floatmultirange);`
  },
  {
    name: 'enum-rename-value',
    v1: `${S} CREATE TYPE fx.c AS ENUM ('red', 'grn'); CREATE TABLE fx.t (id int PRIMARY KEY, c fx.c);`,
    v2: `${S} CREATE TYPE fx.c AS ENUM ('red', 'green'); CREATE TABLE fx.t (id int PRIMARY KEY, c fx.c);`,
    flags: '--allow-data-loss --allow-incomplete',
    rows: "INSERT INTO fx.t VALUES (1, 'red')"
  },
  {
    name: 'composite-attribute-type-change',
    v1: `${S} CREATE TYPE fx.pt AS (x int, y int); CREATE TABLE fx.t (id int PRIMARY KEY, p fx.pt);`,
    v2: `${S} CREATE TYPE fx.pt AS (x bigint, y int, label text COLLATE "C"); CREATE TABLE fx.t (id int PRIMARY KEY, p fx.pt);`,
    flags: '--allow-data-loss',
    rows: 'INSERT INTO fx.t VALUES (1, ROW(1, 2))',
    check: { sql: 'SELECT (p).x AS x, (p).label AS label FROM fx.t', rows: [{ x: '1', label: null }] }
  },
  {
    name: 'shell-type-io-functions',
    v1: `${S}`,
    v2: `${S} CREATE TYPE fx.pt AS (x int, y int); CREATE TYPE fx.clr AS ENUM ('r'); CREATE DOMAIN fx.posint AS int CHECK (VALUE > 0); CREATE TABLE fx.t (id fx.posint PRIMARY KEY, p fx.pt DEFAULT ROW(0, 0), c fx.clr DEFAULT 'r', tags text[] DEFAULT '{}', ints int[] DEFAULT ARRAY[1, 2]);`
  },
  // ---- collations, extensions, operators, casts, aggregates
  {
    name: 'collation-create-and-column-collate',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, name text);`,
    v2: `${S} CREATE COLLATION fx.nocase (provider = icu, locale = 'und-u-ks-level2', deterministic = false); CREATE TABLE fx.t (id int PRIMARY KEY, name text COLLATE fx.nocase);`,
    flags: '--allow-data-loss',
    rows: "INSERT INTO fx.t VALUES (1, 'A')",
    check: { sql: 'SELECT id, name FROM fx.t', rows: [{ id: 1, name: 'A' }] }
  },
  {
    name: 'extension-add-drop-quoted',
    v1: `CREATE EXTENSION IF NOT EXISTS pgcrypto; ${S} CREATE TABLE fx.t (id uuid PRIMARY KEY DEFAULT gen_random_uuid());`,
    v2: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS citext SCHEMA public; ${S} CREATE TABLE fx.t (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), e citext);`,
    revert: 'DROP EXTENSION IF EXISTS pgcrypto; DROP EXTENSION IF EXISTS "uuid-ossp"; DROP EXTENSION IF EXISTS citext;'
  },
  {
    name: 'operator-and-opclass',
    v1: `${S} CREATE FUNCTION fx.add3(int, int) RETURNS int LANGUAGE sql IMMUTABLE AS $$ SELECT $1 + $2 + 3 $$;`,
    v2: `${S} CREATE FUNCTION fx.add3(int, int) RETURNS int LANGUAGE sql IMMUTABLE AS $$ SELECT $1 + $2 + 3 $$; CREATE OPERATOR fx.### (LEFTARG = int, RIGHTARG = int, FUNCTION = fx.add3);`
  },
  {
    name: 'cast-add',
    v1: `${S} CREATE TYPE fx.pt AS (x int, y int); CREATE FUNCTION fx.pt_to_text(fx.pt) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT format('%s,%s', $1.x, $1.y) $$;`,
    v2: `${S} CREATE TYPE fx.pt AS (x int, y int); CREATE FUNCTION fx.pt_to_text(fx.pt) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT format('%s,%s', $1.x, $1.y) $$; CREATE CAST (fx.pt AS text) WITH FUNCTION fx.pt_to_text(fx.pt) AS ASSIGNMENT;`,
    revert: ''
  },
  {
    name: 'aggregate-add-and-change',
    v1: `${S} CREATE FUNCTION fx.sum_sfunc(int, int) RETURNS int LANGUAGE sql IMMUTABLE AS $$ SELECT $1 + $2 $$; CREATE AGGREGATE fx.mysum (int) (SFUNC = fx.sum_sfunc, STYPE = int, INITCOND = '0');`,
    v2: `${S} CREATE FUNCTION fx.sum_sfunc(int, int) RETURNS int LANGUAGE sql IMMUTABLE AS $$ SELECT $1 + $2 $$; CREATE FUNCTION fx.sum_final(int) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT $1::text $$; CREATE AGGREGATE fx.mysum (int) (SFUNC = fx.sum_sfunc, STYPE = int, FINALFUNC = fx.sum_final, INITCOND = '0', PARALLEL = SAFE);`
  },
  // ---- functions and procedures
  {
    name: 'procedure-body-change',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY); CREATE PROCEDURE fx.ins(p int) LANGUAGE plpgsql AS $$ BEGIN INSERT INTO fx.t VALUES (p); END $$;`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY); CREATE PROCEDURE fx.ins(p int) LANGUAGE plpgsql AS $$ BEGIN INSERT INTO fx.t VALUES (p); COMMIT; END $$;`
  },
  {
    name: 'function-overloads-one-changes',
    v1: `${S} CREATE FUNCTION fx.f(int) RETURNS int LANGUAGE sql AS $$ SELECT $1 $$; CREATE FUNCTION fx.f(text) RETURNS text LANGUAGE sql AS $$ SELECT $1 $$;`,
    v2: `${S} CREATE FUNCTION fx.f(int) RETURNS int LANGUAGE sql AS $$ SELECT $1 + 1 $$; CREATE FUNCTION fx.f(text) RETURNS text LANGUAGE sql AS $$ SELECT $1 $$; CREATE FUNCTION fx.f(int, int) RETURNS int LANGUAGE sql AS $$ SELECT $1 + $2 $$;`,
    deployed: [/CREATE OR REPLACE FUNCTION fx\.f\(int/]
  },
  {
    name: 'function-default-args-out-params-returns-table',
    v1: `${S} CREATE FUNCTION fx.g(a int, b int DEFAULT 1) RETURNS int LANGUAGE sql AS $$ SELECT a + b $$; CREATE FUNCTION fx.o(IN a int, OUT dbl int, OUT tpl int) LANGUAGE sql AS $$ SELECT a * 2, a * 3 $$;`,
    v2: `${S} CREATE FUNCTION fx.g(a int, b int DEFAULT 2) RETURNS int LANGUAGE sql AS $$ SELECT a + b $$; CREATE FUNCTION fx.o(IN a int, OUT dbl int, OUT tpl int, OUT quad int) LANGUAGE sql AS $$ SELECT a * 2, a * 3, a * 4 $$; CREATE FUNCTION fx.rt(n int) RETURNS TABLE (i int, sq int) LANGUAGE sql AS $$ SELECT g, g * g FROM generate_series(1, n) g $$; CREATE FUNCTION fx.so(n int) RETURNS SETOF int LANGUAGE sql AS $$ SELECT generate_series(1, n) $$;`
  },
  {
    name: 'function-security-definer-search-path-volatility',
    v1: `${S} CREATE FUNCTION fx.s() RETURNS int LANGUAGE sql VOLATILE AS $$ SELECT 1 $$;`,
    v2: `${S} CREATE FUNCTION fx.s() RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = fx, pg_temp PARALLEL SAFE COST 10 AS $$ SELECT 1 $$;`,
    deployed: [/CREATE OR REPLACE FUNCTION fx\.s\(\)/]
  },
  {
    name: 'function-return-type-change-with-view-dependent',
    v1: `${S} CREATE FUNCTION fx.r() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$; CREATE VIEW fx.v AS SELECT fx.r() AS r;`,
    v2: `${S} CREATE FUNCTION fx.r() RETURNS bigint LANGUAGE sql AS $$ SELECT 1 $$; CREATE VIEW fx.v AS SELECT fx.r() AS r;`
  },
  {
    name: 'function-sql-standard-body',
    v1: `${S} CREATE FUNCTION fx.k(a int) RETURNS int LANGUAGE sql BEGIN ATOMIC SELECT a * 2; END;`,
    v2: `${S} CREATE FUNCTION fx.k(a int) RETURNS int LANGUAGE sql BEGIN ATOMIC SELECT a * 3; END;`
  },
  // ---- views
  {
    name: 'view-check-option-security-invoker',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, n int); CREATE VIEW fx.v AS SELECT id, n FROM fx.t WHERE n > 0;`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, n int); CREATE VIEW fx.v WITH (security_invoker = true, security_barrier = true) AS SELECT id, n FROM fx.t WHERE n > 0 WITH CASCADED CHECK OPTION;`
  },
  {
    name: 'view-recursive-and-column-list',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, parent int);`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, parent int); CREATE RECURSIVE VIEW fx.tree (id, depth) AS SELECT id, 0 FROM fx.t WHERE parent IS NULL UNION ALL SELECT t.id, tree.depth + 1 FROM fx.t t JOIN tree ON t.parent = tree.id; CREATE VIEW fx.named (a, b) AS SELECT id, parent FROM fx.t;`
  },
  {
    name: 'matview-with-index-and-no-data',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, n int);`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, n int); CREATE MATERIALIZED VIEW fx.mv WITH (fillfactor = 90) AS SELECT id, n FROM fx.t WITH NO DATA; CREATE UNIQUE INDEX mv_id ON fx.mv (id);`
  },
  {
    name: 'matview-definition-change-keeps-index',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, n int); CREATE MATERIALIZED VIEW fx.mv AS SELECT id, n FROM fx.t; CREATE UNIQUE INDEX mv_id ON fx.mv (id);`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, n int); CREATE MATERIALIZED VIEW fx.mv AS SELECT id, n, n * 2 AS dbl FROM fx.t; CREATE UNIQUE INDEX mv_id ON fx.mv (id);`
  },
  // ---- identifiers
  {
    name: 'quoted-mixed-case-unicode-reserved',
    v1: `${S} CREATE TABLE fx."MyTable" ("Id" int PRIMARY KEY, "order" text, "tëst" int); CREATE TABLE fx."user" (id int PRIMARY KEY);`,
    v2: `${S} CREATE TABLE fx."MyTable" ("Id" int PRIMARY KEY, "order" text NOT NULL DEFAULT 'x', "tëst" bigint, "select" boolean); CREATE TABLE fx."user" (id int PRIMARY KEY, "group" text); CREATE INDEX "MyTable_order_Idx" ON fx."MyTable" ("order"); CREATE VIEW fx."View One" AS SELECT "Id", "order" FROM fx."MyTable";`,
    flags: '--allow-data-loss',
    rows: `INSERT INTO fx."MyTable" VALUES (1, 'o', 2)`,
    check: { sql: 'SELECT "Id", "order", "tëst" FROM fx."MyTable"', rows: [{ Id: 1, order: 'o', 'tëst': '2' }] }
  },
  {
    name: 'quoted-schema-and-dollar-names',
    v1: `CREATE SCHEMA "Fx Two"; ${S} CREATE TABLE "Fx Two".t (id int PRIMARY KEY);`,
    v2: `CREATE SCHEMA "Fx Two"; ${S} CREATE TABLE "Fx Two".t (id int PRIMARY KEY, a$b int); CREATE TABLE "Fx Two"."t 2" (id int PRIMARY KEY REFERENCES "Fx Two".t (id));`,
    revert: 'DROP SCHEMA "Fx Two" CASCADE;'
  },
  // ---- storage, reloptions, persistence
  {
    name: 'column-storage-compression',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, body text);`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, body text STORAGE EXTERNAL COMPRESSION pglz);`
  },
  {
    name: 'table-reloptions-and-unlogged',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY) WITH (fillfactor = 70); CREATE TABLE fx.u (id int PRIMARY KEY);`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY) WITH (fillfactor = 90, autovacuum_enabled = false); CREATE UNLOGGED TABLE fx.u (id int PRIMARY KEY);`
  },
  // ---- sequences and identity
  {
    name: 'sequence-owned-by-and-options',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY); CREATE SEQUENCE fx.s AS int INCREMENT BY 2 OWNED BY fx.t.id;`,
    v2: `${S} CREATE SEQUENCE fx.s AS bigint INCREMENT BY 5 START WITH 100 CYCLE; CREATE TABLE fx.t (id int PRIMARY KEY, n int DEFAULT nextval('fx.s')); ALTER SEQUENCE fx.s OWNED BY fx.t.n;`
  },
  {
    name: 'identity-always-vs-by-default',
    v1: `${S} CREATE TABLE fx.t (id int GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, n int);`,
    v2: `${S} CREATE TABLE fx.t (id int GENERATED ALWAYS AS IDENTITY (START WITH 10 INCREMENT BY 2) PRIMARY KEY, n int GENERATED BY DEFAULT AS IDENTITY);`,
    rows: 'INSERT INTO fx.t (n) VALUES (5)'
  },
  {
    name: 'serial-to-identity',
    v1: `${S} CREATE TABLE fx.t (id serial PRIMARY KEY);`,
    v2: `${S} CREATE TABLE fx.t (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY);`,
    flags: '--allow-data-loss --allow-incomplete'
  },
  // ---- comments and grants on every kind
  {
    name: 'comments-every-object-kind',
    v1: [S, 'CREATE TABLE fx.t (id int PRIMARY KEY, n int CONSTRAINT n_pos CHECK (n > 0)); CREATE INDEX t_n ON fx.t (n); CREATE SEQUENCE fx.s; CREATE DOMAIN fx.d AS int; CREATE TYPE fx.e AS ENUM (\'a\'); CREATE VIEW fx.v AS SELECT id FROM fx.t;',
      'CREATE FUNCTION fx.tg() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$; CREATE TRIGGER t_tg BEFORE INSERT ON fx.t FOR EACH ROW EXECUTE FUNCTION fx.tg();',
      'ALTER TABLE fx.t ENABLE ROW LEVEL SECURITY; CREATE POLICY p ON fx.t USING (true);'].join('\n'),
    v2: [S, 'CREATE TABLE fx.t (id int PRIMARY KEY, n int CONSTRAINT n_pos CHECK (n > 0)); CREATE INDEX t_n ON fx.t (n); CREATE SEQUENCE fx.s; CREATE DOMAIN fx.d AS int; CREATE TYPE fx.e AS ENUM (\'a\'); CREATE VIEW fx.v AS SELECT id FROM fx.t;',
      'CREATE FUNCTION fx.tg() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$; CREATE TRIGGER t_tg BEFORE INSERT ON fx.t FOR EACH ROW EXECUTE FUNCTION fx.tg();',
      'ALTER TABLE fx.t ENABLE ROW LEVEL SECURITY; CREATE POLICY p ON fx.t USING (true);',
      "COMMENT ON SCHEMA fx IS 'schema'; COMMENT ON TABLE fx.t IS 'table'; COMMENT ON COLUMN fx.t.n IS 'col'; COMMENT ON CONSTRAINT n_pos ON fx.t IS 'con'; COMMENT ON INDEX fx.t_n IS 'idx';",
      "COMMENT ON SEQUENCE fx.s IS 'seq'; COMMENT ON DOMAIN fx.d IS 'dom'; COMMENT ON TYPE fx.e IS 'enum'; COMMENT ON VIEW fx.v IS 'view'; COMMENT ON FUNCTION fx.tg() IS 'fn';",
      "COMMENT ON TRIGGER t_tg ON fx.t IS 'trg'; COMMENT ON POLICY p ON fx.t IS 'pol';"].join('\n'),
    notDeployed: [/DROP /]
  },
  {
    name: 'grants-non-table-objects',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY); CREATE SEQUENCE fx.s; CREATE FUNCTION fx.f() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$; CREATE TYPE fx.e AS ENUM ('a');`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY); CREATE SEQUENCE fx.s; CREATE FUNCTION fx.f() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$; CREATE TYPE fx.e AS ENUM ('a');
      GRANT USAGE ON SCHEMA fx TO fx_reader; GRANT SELECT (id) ON fx.t TO fx_reader; GRANT USAGE, SELECT ON SEQUENCE fx.s TO fx_reader; REVOKE EXECUTE ON FUNCTION fx.f() FROM PUBLIC; GRANT EXECUTE ON FUNCTION fx.f() TO fx_reader; GRANT USAGE ON TYPE fx.e TO fx_reader; GRANT SELECT ON ALL TABLES IN SCHEMA fx TO fx_reader; ALTER DEFAULT PRIVILEGES IN SCHEMA fx GRANT SELECT ON TABLES TO fx_reader;`,
    roles: ['fx_reader'],
    notDeployed: [/DROP /]
  },
  {
    name: 'owner-change',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY); CREATE FUNCTION fx.f() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY); CREATE FUNCTION fx.f() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$; ALTER TABLE fx.t OWNER TO fx_owner; ALTER FUNCTION fx.f() OWNER TO fx_owner; ALTER SCHEMA fx OWNER TO fx_owner;`,
    roles: ['fx_owner'],
    flags: '--allow-incomplete',
    notDeployed: [/DROP /],
    // v1 declares no owner, so the inverse of OWNER TO is not derivable: the
    // revert is reported incomplete and leaves fx_owner (and its implicit
    // privileges) in place.
    revertResidual: [
      /^grants: fx\.f\(\):fx_owner:EXECUTE only in original$/,
      ...['DELETE', 'INSERT', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE', 'USAGE'].map(p => new RegExp(`^grants: fx\\.t:fx_owner:${p} only in original$`)),
      /^grants: fx:fx_owner:CREATE only in original$/,
      /^grants: fx:fx_owner:USAGE only in original$/,
      /^owners: function:fx\.f\(\) differs\n\s+original:\s+fx_owner\n\s+transformed:\s+postgres$/,
      /^owners: relation:fx\.t differs\n\s+original:\s+fx_owner\n\s+transformed:\s+postgres$/,
      /^owners: schema:fx differs\n\s+original:\s+fx_owner\n\s+transformed:\s+postgres$/,
      /^owners: type:fx\.t differs\n\s+original:\s+fx_owner\n\s+transformed:\s+postgres$/
    ]
  },
  // ---- misc statements
  {
    name: 'rule-and-statistics',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, a int, b int);`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, a int, b int); CREATE STATISTICS fx.t_ab (dependencies) ON a, b FROM fx.t; CREATE RULE t_noop AS ON DELETE TO fx.t DO INSTEAD NOTHING;`
  },
  {
    name: 'column-type-change-with-index-and-view',
    v1: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, code varchar(10), n int); CREATE INDEX t_code ON fx.t (code); CREATE VIEW fx.v AS SELECT code, n FROM fx.t;`,
    v2: `${S} CREATE TABLE fx.t (id int PRIMARY KEY, code text, n numeric(12,2)); CREATE INDEX t_code ON fx.t (code); CREATE VIEW fx.v AS SELECT code, n FROM fx.t;`,
    flags: '--allow-data-loss',
    rows: "INSERT INTO fx.t VALUES (1, 'ab', 3)",
    check: { sql: 'SELECT code, n FROM fx.t', rows: [{ code: 'ab', n: '3.00' }] }
  },
  {
    name: 'array-and-composite-column-types',
    v1: `${S} CREATE TYPE fx.pt AS (x int, y int); CREATE TABLE fx.t (id int PRIMARY KEY, pts fx.pt[], m int[][], d numeric(5,2)[]);`,
    v2: `${S} CREATE TYPE fx.pt AS (x int, y int); CREATE TABLE fx.t (id int PRIMARY KEY, pts fx.pt[] NOT NULL DEFAULT '{}', m int[][], d numeric(5,2)[], ranges int4range[] DEFAULT ARRAY['[1,2)'::int4range]);`,
    rows: "INSERT INTO fx.t VALUES (1, ARRAY[ROW(1,2)::fx.pt], NULL, NULL)"
  }
];

describe('pgpm diff e2e: real-world constructs', () => {
  let fixture: CLIDeployTestFixture;
  let wsDir: string;

  beforeAll(async () => {
    await loadModule();
    fixture = new CLIDeployTestFixture();
    wsDir = path.join(fixture.tempFixtureDir, WS);
    fs.mkdirSync(wsDir, { recursive: true });
    fs.writeFileSync(path.join(wsDir, 'pgpm.json'), '{\n    "packages": [\n        "*"\n    ]\n}');
    // `pgpm diff` exits the process on a policy error; surface it as a test failure instead.
    jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  const only = process.env.DIFF_CASES ? new Set(process.env.DIFF_CASES.split(',')) : null;
  const dials = (process.env.DIFF_DIALS ?? '').split(';').filter(Boolean);
  const variants = dials.length > 0 ? dials : [''];

  for (const c of CASES) {
    if (only && !only.has(c.name)) continue;
    for (const dial of variants) {
      const suffix = dial ? `-${dial.replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}` : '';
      it(`${c.name}${suffix}: migrates v1 to v2 and reverts to v1`, async () => {
        const v1 = `${c.name}-v1`;
        const v2 = `${c.name}-v2`;
        const mig = `${c.name}${suffix}-mig`;
        writeModule(path.join(wsDir, v1), v1, c.v1, c.revert ?? '');
        writeModule(path.join(wsDir, v2), v2, c.v2, c.revert ?? '');
        const v2Db = await fixture.setupTestDatabase();
        const testDb = await fixture.setupTestDatabase();
        for (const role of c.roles ?? []) {
          await testDb.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN CREATE ROLE ${role} NOLOGIN; END IF; END $$`);
        }
        for (const [db, pkg] of [[v2Db, v2], [testDb, v1]] as const) {
          await fixture.runTerminalCommands(`
            cd ${WS}/${pkg}
            pgpm deploy --database ${db.name} --package ${pkg} --yes
          `, { database: db.name });
        }
        const v1Catalog = withoutColumnOrder(await snapshotCatalog(testDb));
        if (c.rows) await testDb.query(c.rows);

        await fixture.runTerminalCommands(`
          cd ${WS}
          pgpm diff ${v1} ${v2} ${c.flags ?? ''} ${dial} --emit-migration . --pkg ${mig}
        `, {});
        const migrationDir = path.join(wsDir, mig);
        const deployed = fs.readdirSync(path.join(migrationDir, 'deploy'), { recursive: true })
          .map(String).filter(f => f.endsWith('.sql'))
          .map(f => fs.readFileSync(path.join(migrationDir, 'deploy', f), 'utf-8')).join('\n');
        for (const re of c.deployed ?? []) expect(deployed).toMatch(re);
        for (const re of c.notDeployed ?? []) expect(deployed).not.toMatch(re);

        await fixture.runTerminalCommands(`
          cd ${WS}/${mig}
          pgpm deploy --database ${testDb.name} --package ${mig} --yes
        `, { database: testDb.name });
        const forward = diffCatalogSnapshots(withoutColumnOrder(await snapshotCatalog(testDb)), withoutColumnOrder(await snapshotCatalog(v2Db)));
        expect(forward).toEqual((c.forwardResidual ?? []).map(re => expect.stringMatching(re)));
        if (c.check) {
          const rows = await testDb.query(c.check.sql);
          expect(rows.rows).toEqual(c.check.rows);
        }

        await fixture.runTerminalCommands(`
          cd ${WS}/${mig}
          pgpm revert --database ${testDb.name} --package ${mig} --yes --no-recursive
        `, { database: testDb.name });
        const back = diffCatalogSnapshots(withoutColumnOrder(await snapshotCatalog(testDb)), v1Catalog);
        expect(back).toEqual((c.revertResidual ?? []).map(re => expect.stringMatching(re)));
      });
    }
  }
});
