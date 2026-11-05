/**
 * Hardening cases for `diffSchemas`: column attribute changes, USING casts,
 * explicit renames, data-loss and incompleteness policies, non-table ALTERs
 * (enum/domain/sequence/composite), constraint attributes, comments/grants,
 * and module-vs-dump representation differences. Each case reproduces a bug
 * observed against a live Postgres 18 (see the PR description).
 */
import { loadModule } from 'plpgsql-parser';

import { diffSchemas as diffSchemasTyped, SemanticDiffOptions } from '../src/semantic-diff-driver';

// Options are typed loosely so this file compiles against the pre-fix driver too.
const diffSchemas = (from: string, to: string, options?: Record<string, unknown>): ReturnType<typeof diffSchemasTyped> =>
  diffSchemasTyped(from, to, options as SemanticDiffOptions);

beforeAll(async () => {
  await loadModule();
});

const S = 'CREATE SCHEMA app;';
const sql = (result: ReturnType<typeof diffSchemas>, key: 'deploy' | 'revert'): string =>
  result.changes.map(c => c[key]).join('\n');
const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();
const lax = { allowDataLoss: true, allowIncomplete: true };

describe('diffSchemas: column attribute changes', () => {
  it('emits SET/DROP DEFAULT and SET/DROP NOT NULL with exact inverses', () => {
    const from = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, name text, qty int DEFAULT 0, flag boolean NOT NULL DEFAULT false);`;
    const to = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, name text NOT NULL DEFAULT 'x', qty int, flag boolean);`;
    const result = diffSchemas(from, to);
    expect(result.warnings).toEqual([]);
    const deploy = norm(sql(result, 'deploy'));
    const revert = norm(sql(result, 'revert'));
    expect(deploy).toMatch(/ALTER COLUMN name SET DEFAULT 'x'/);
    expect(deploy).toMatch(/ALTER COLUMN name SET NOT NULL/);
    expect(deploy).toMatch(/ALTER COLUMN qty DROP DEFAULT/);
    expect(deploy).toMatch(/ALTER COLUMN flag DROP NOT NULL/);
    expect(deploy).toMatch(/ALTER COLUMN flag DROP DEFAULT/);
    expect(revert).toMatch(/ALTER COLUMN name DROP DEFAULT/);
    expect(revert).toMatch(/ALTER COLUMN name DROP NOT NULL/);
    expect(revert).toMatch(/ALTER COLUMN qty SET DEFAULT 0/);
    expect(revert).toMatch(/ALTER COLUMN flag SET NOT NULL/);
    expect(revert).toMatch(/ALTER COLUMN flag SET DEFAULT false/);
    // Nothing else: the shared column `id` is untouched.
    expect(deploy).not.toMatch(/ALTER COLUMN id/);
  });

  it('sets NOT NULL explicitly when a column joins a primary key, so the revert drops it', () => {
    const from = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, k text);`;
    const to = `${S}\nCREATE TABLE app.t (id int, k text, PRIMARY KEY (id, k));`;
    const result = diffSchemas(from, to);
    expect(result.warnings).toEqual([]);
    expect(norm(sql(result, 'deploy'))).toMatch(/ALTER COLUMN k SET NOT NULL/);
    expect(norm(sql(result, 'revert'))).toMatch(/ALTER COLUMN k DROP NOT NULL/);
    // DROP NOT NULL must follow DROP CONSTRAINT t_pkey in the revert.
    const revert = norm(sql(result, 'revert'));
    expect(revert.indexOf('DROP CONSTRAINT t_pkey')).toBeLessThan(revert.indexOf('ALTER COLUMN k DROP NOT NULL'));
  });

  it('adds and drops identity', () => {
    const from = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, n int);`;
    const to = `${S}\nCREATE TABLE app.t (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, n int);`;
    const result = diffSchemas(from, to);
    expect(result.warnings).toEqual([]);
    expect(norm(sql(result, 'deploy'))).toMatch(/ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY/);
    expect(norm(sql(result, 'revert'))).toMatch(/ALTER COLUMN id DROP IDENTITY/);
  });

  it('emits USING <col>::<type> for a type change and accepts a user cast', () => {
    const from = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, code text);`;
    const to = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, code int);`;
    const result = diffSchemas(from, to, { allowDataLoss: true });
    expect(norm(sql(result, 'deploy'))).toMatch(/ALTER COLUMN code (SET DATA )?TYPE int(eger)? USING code::int(eger)?/);
    expect(norm(sql(result, 'revert'))).toMatch(/ALTER COLUMN code (SET DATA )?TYPE text USING code::text/);
    const custom = diffSchemas(from, to, { allowDataLoss: true, casts: { 'app.t.code': 'nullif(code, \'\')::int' } });
    expect(norm(sql(custom, 'deploy'))).toMatch(/USING (nullif\(code, ''\)::int|CAST\(NULLIF ?\(code, ''\) AS int\))/i);
  });

  it('rebuilds a generated column whose expression changed (derived data, no opt-in)', () => {
    const from = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, a int, b int, c int GENERATED ALWAYS AS (a + b) STORED);`;
    const to = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, a int, b int, c int GENERATED ALWAYS AS (a * b) STORED);`;
    const result = diffSchemas(from, to);
    expect(result.warnings).toEqual([]);
    const deploy = norm(sql(result, 'deploy'));
    expect(deploy).toMatch(/DROP COLUMN c/);
    expect(deploy).toMatch(/ADD COLUMN c int(eger)? GENERATED ALWAYS AS \(a \* b\) STORED/);
    expect(norm(sql(result, 'revert'))).toMatch(/GENERATED ALWAYS AS \(a \+ b\) STORED/);
  });
});

describe('diffSchemas: policies', () => {
  it('refuses a column drop (data loss) unless allowDataLoss', () => {
    const from = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, nm text);`;
    const to = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY);`;
    expect(() => diffSchemas(from, to)).toThrow(/data loss[\s\S]*app\.t[\s\S]*nm/);
    const result = diffSchemas(from, to, { allowDataLoss: true });
    expect(norm(sql(result, 'deploy'))).toMatch(/DROP COLUMN nm/);
  });

  it('refuses a table drop and a type change unless allowDataLoss', () => {
    const from = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, code text);\nCREATE TABLE app.gone (id int);`;
    const to = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, code int);`;
    expect(() => diffSchemas(from, to)).toThrow(/app\.gone/);
    expect(() => diffSchemas(from, to)).toThrow(/app\.t[\s\S]*code/);
    expect(diffSchemas(from, to, { allowDataLoss: true }).changes.length).toBeGreaterThan(0);
  });

  it('never infers a rename; an explicit declaration emits RENAME and its inverse', () => {
    const from = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, nm text);`;
    const to = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, name text);`;
    expect(() => diffSchemas(from, to)).toThrow(/data loss/);
    const result = diffSchemas(from, to, {
      renames: [{ kind: 'column', schema: 'app', table: 't', from: 'nm', to: 'name' }]
    });
    expect(result.warnings).toEqual([]);
    const deploy = norm(sql(result, 'deploy'));
    expect(deploy).toMatch(/ALTER TABLE app\.t RENAME (COLUMN )?nm TO name/);
    expect(deploy).not.toMatch(/DROP COLUMN/);
    expect(norm(sql(result, 'revert'))).toMatch(/RENAME (COLUMN )?name TO nm/);
  });

  it('renames a table on declaration instead of drop+create', () => {
    const from = `${S}\nCREATE TABLE app.old (id int PRIMARY KEY, nm text);`;
    const to = `${S}\nCREATE TABLE app.new (id int PRIMARY KEY, nm text);`;
    const result = diffSchemas(from, to, { renames: [{ kind: 'table', schema: 'app', from: 'old', to: 'new' }] });
    expect(result.warnings).toEqual([]);
    const deploy = norm(sql(result, 'deploy'));
    expect(deploy).toMatch(/ALTER TABLE app\.old RENAME TO new/);
    expect(deploy).not.toMatch(/DROP TABLE/);
    expect(deploy).not.toMatch(/CREATE TABLE/);
    expect(norm(sql(result, 'revert'))).toMatch(/ALTER TABLE app\.new RENAME TO old/);
  });

  it('rejects a rename declaration whose columns are not a removed/added pair', () => {
    const from = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, nm text);`;
    const to = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, nm text, other text);`;
    expect(() =>
      diffSchemas(from, to, { renames: [{ kind: 'column', schema: 'app', table: 't', from: 'nm', to: 'other' }] })
    ).toThrow(/rename/);
  });

  it('fails on a non-derivable inverse unless allowIncomplete', () => {
    const from = `${S}\nCREATE TYPE app.status AS ENUM ('a', 'b');`;
    const to = `${S}\nCREATE TYPE app.status AS ENUM ('a', 'b', 'c');`;
    // ALTER TYPE .. ADD VALUE has no inverse in Postgres.
    expect(() => diffSchemas(from, to)).toThrow(/app\.status[\s\S]*(inverse|revert)/i);
    const result = diffSchemas(from, to, { allowIncomplete: true });
    expect(result.warnings.join('\n')).toMatch(/app\.status/);
    expect(norm(sql(result, 'deploy'))).toMatch(/ALTER TYPE app\.status ADD VALUE 'c'/);
  });
});

describe('diffSchemas: non-table objects alter in place', () => {
  it('appends enum values with ALTER TYPE .. ADD VALUE instead of drop+create', () => {
    const from = `${S}\nCREATE TYPE app.status AS ENUM ('a', 'b');\nCREATE TABLE app.t (id int PRIMARY KEY, s app.status);`;
    const to = `${S}\nCREATE TYPE app.status AS ENUM ('a', 'b', 'c');\nCREATE TABLE app.t (id int PRIMARY KEY, s app.status);`;
    const result = diffSchemas(from, to, lax);
    const deploy = norm(sql(result, 'deploy'));
    expect(deploy).toMatch(/ALTER TYPE app\.status ADD VALUE 'c'/);
    expect(deploy).not.toMatch(/DROP TYPE/);
  });

  it('alters a domain constraint in place', () => {
    const from = `${S}\nCREATE DOMAIN app.email AS text CHECK (VALUE ~ '@');\nCREATE TABLE app.t (id int PRIMARY KEY, e app.email);`;
    const to = `${S}\nCREATE DOMAIN app.email AS text CHECK (VALUE ~ '@' AND length(VALUE) > 3);\nCREATE TABLE app.t (id int PRIMARY KEY, e app.email);`;
    const result = diffSchemas(from, to);
    expect(result.warnings).toEqual([]);
    const deploy = norm(sql(result, 'deploy'));
    expect(deploy).toMatch(/ALTER DOMAIN app\.email DROP CONSTRAINT email_check/);
    expect(deploy).toMatch(/ALTER DOMAIN app\.email ADD CONSTRAINT email_check CHECK \(VALUE ~ '@' AND length\(VALUE\) > 3\)/i);
    expect(deploy).not.toMatch(/DROP DOMAIN/);
    expect(norm(sql(result, 'revert'))).toMatch(/ADD CONSTRAINT email_check CHECK \(VALUE ~ '@'\)/i);
  });

  it('alters sequence options in place', () => {
    const from = `${S}\nCREATE SEQUENCE app.s START 1;\nCREATE TABLE app.t (id bigint PRIMARY KEY DEFAULT nextval('app.s'));`;
    const to = `${S}\nCREATE SEQUENCE app.s START 100 INCREMENT 5;\nCREATE TABLE app.t (id bigint PRIMARY KEY DEFAULT nextval('app.s'));`;
    const result = diffSchemas(from, to);
    expect(result.warnings).toEqual([]);
    const deploy = norm(sql(result, 'deploy'));
    expect(deploy).toMatch(/ALTER SEQUENCE app\.s (START( WITH)? 100 INCREMENT( BY)? 5|INCREMENT( BY)? 5 START( WITH)? 100)/);
    expect(deploy).not.toMatch(/DROP SEQUENCE/);
    expect(norm(sql(result, 'revert'))).toMatch(/ALTER SEQUENCE app\.s (START( WITH)? 1 INCREMENT( BY)? 1|INCREMENT( BY)? 1 START( WITH)? 1)/);
  });

  it('adds and drops composite type attributes in place', () => {
    const from = `${S}\nCREATE TYPE app.pt AS (x int, y int);\nCREATE FUNCTION app.mk(a int) RETURNS app.pt LANGUAGE sql AS $$ SELECT ROW(a, a)::app.pt $$;`;
    const to = `${S}\nCREATE TYPE app.pt AS (x int, y int, z int);\nCREATE FUNCTION app.mk(a int) RETURNS app.pt LANGUAGE sql AS $$ SELECT ROW(a, a, a)::app.pt $$;`;
    const result = diffSchemas(from, to);
    expect(result.warnings).toEqual([]);
    const deploy = norm(sql(result, 'deploy'));
    expect(deploy).toMatch(/ALTER TYPE app\.pt ADD ATTRIBUTE z int(eger)?/);
    expect(deploy).not.toMatch(/DROP TYPE/);
    expect(norm(sql(result, 'revert'))).toMatch(/ALTER TYPE app\.pt DROP ATTRIBUTE z/);
  });

  it('rebuilds a function whose signature uses a type that is replaced', () => {
    const from = `${S}\nCREATE TYPE app.pt AS (x int, y int);\nCREATE FUNCTION app.mk(a int) RETURNS app.pt LANGUAGE sql AS $$ SELECT ROW(a, a)::app.pt $$;`;
    const to = `${S}\nCREATE TYPE app.pt AS RANGE (subtype = int4);\nCREATE FUNCTION app.mk(a int) RETURNS app.pt LANGUAGE sql AS $$ SELECT app.pt(a, a) $$;`;
    const result = diffSchemas(from, to, lax);
    const deploy = norm(sql(result, 'deploy'));
    expect(deploy.indexOf('DROP FUNCTION app.mk')).toBeGreaterThan(-1);
    expect(deploy.indexOf('DROP FUNCTION app.mk')).toBeLessThan(deploy.indexOf('DROP TYPE app.pt'));
    expect(deploy.indexOf('CREATE TYPE app.pt')).toBeLessThan(deploy.indexOf('CREATE FUNCTION app.mk'));
  });
});

describe('diffSchemas: constraint attributes, comments, grants', () => {
  it('keeps column-level DEFERRABLE INITIALLY DEFERRED on a foreign key', () => {
    const from = `${S}\nCREATE TABLE app.p (id int PRIMARY KEY);\nCREATE TABLE app.c (id int PRIMARY KEY, p_id int REFERENCES app.p(id));`;
    const to = `${S}\nCREATE TABLE app.p (id int PRIMARY KEY);\nCREATE TABLE app.c (id int PRIMARY KEY, p_id int REFERENCES app.p(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED);`;
    const result = diffSchemas(from, to);
    expect(result.warnings).toEqual([]);
    const deploy = norm(sql(result, 'deploy'));
    expect(deploy).toMatch(/DROP CONSTRAINT c_p_id_fkey/);
    expect(deploy).toMatch(/ADD CONSTRAINT c_p_id_fkey FOREIGN KEY \(p_id\) REFERENCES app\.p ?\(id\) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED/);
    expect(deploy).not.toMatch(/ALTER COLUMN/);
  });

  it('diffs COMMENT ON table/column with the previous comment as inverse', () => {
    const from = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY);\nCOMMENT ON TABLE app.t IS 'one';\nCOMMENT ON COLUMN app.t.id IS 'a';`;
    const to = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY);\nCOMMENT ON TABLE app.t IS 'two';`;
    const result = diffSchemas(from, to);
    expect(result.warnings).toEqual([]);
    const deploy = norm(sql(result, 'deploy'));
    expect(deploy).toMatch(/COMMENT ON TABLE app\.t IS 'two'/);
    expect(deploy).toMatch(/COMMENT ON COLUMN app\.t\.id IS NULL/);
    const revert = norm(sql(result, 'revert'));
    expect(revert).toMatch(/COMMENT ON TABLE app\.t IS 'one'/);
    expect(revert).toMatch(/COMMENT ON COLUMN app\.t\.id IS 'a'/);
  });

  it('diffs GRANTs per grantee with REVOKE as inverse', () => {
    const from = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY);\nGRANT SELECT ON app.t TO app_user;`;
    const to = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY);\nGRANT SELECT, INSERT ON app.t TO app_user;`;
    const result = diffSchemas(from, to);
    expect(result.warnings).toEqual([]);
    expect(norm(sql(result, 'deploy'))).toMatch(/GRANT INSERT ON (TABLE )?app\.t TO app_user/);
    expect(norm(sql(result, 'revert'))).toMatch(/REVOKE INSERT ON (TABLE )?app\.t FROM app_user/);
  });
});

describe('diffSchemas: module vs dump representations', () => {
  it('treats pg_catalog type spellings as equal to their aliases', () => {
    const from = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, u timestamptz, n int8, f float8, b bool, v varchar(10), d numeric(10,2));`;
    const to = `${S}\nCREATE TABLE app.t (id integer PRIMARY KEY, u timestamp with time zone, n bigint, f double precision, b boolean, v character varying(10), d numeric(10,2));`;
    expect(diffSchemas(from, to).identical).toBe(true);
  });

  it('treats a default cast to the column type and nextval regclass casts as equal', () => {
    const from = `${S}\nCREATE TYPE app.status AS ENUM ('a');\nCREATE SEQUENCE app.s;\nCREATE TABLE app.t (id bigint PRIMARY KEY DEFAULT nextval('app.s'), s app.status DEFAULT 'a', n text DEFAULT 'x');`;
    const to = `${S}\nCREATE TYPE app.status AS ENUM ('a');\nCREATE SEQUENCE app.s;\nCREATE TABLE app.t (id bigint PRIMARY KEY DEFAULT nextval('app.s'::regclass), s app.status DEFAULT 'a'::app.status, n text DEFAULT 'x'::text);`;
    expect(diffSchemas(from, to).identical).toBe(true);
  });
});

describe('diffSchemas: review follow-ups', () => {
  it('inserts several enum values at the head referencing only labels that exist at that point', () => {
    const from = `${S}\nCREATE TYPE app.status AS ENUM ('a');`;
    const to = `${S}\nCREATE TYPE app.status AS ENUM ('x', 'y', 'a');`;
    const deploy = norm(sql(diffSchemas(from, to, lax), 'deploy'));
    expect(deploy).toMatch(/ADD VALUE 'x' BEFORE 'a'/);
    expect(deploy).toMatch(/ADD VALUE 'y' AFTER 'x'/);
    expect(deploy).not.toMatch(/BEFORE 'y'/);
  });

  it('names an enum value that is added and used in the same migration (Postgres rejects it in one transaction)', () => {
    const from = `${S}\nCREATE TYPE app.status AS ENUM ('a');\nCREATE TABLE app.t (id int PRIMARY KEY, s app.status NOT NULL DEFAULT 'a');`;
    const to = `${S}\nCREATE TYPE app.status AS ENUM ('a', 'c');\nCREATE TABLE app.t (id int PRIMARY KEY, s app.status NOT NULL DEFAULT 'c');`;
    expect(() => diffSchemas(from, to)).toThrow(/enum value 'c'.*same migration/);
    const result = diffSchemas(from, to, lax);
    expect(result.warnings.join('\n')).toMatch(/enum value 'c'.*same migration.*--no-tx/);
    expect(sql(result, 'deploy')).toMatch(/--no-tx/);
  });

  it('reports a composite attribute inserted mid-list as incomplete (ADD ATTRIBUTE appends)', () => {
    const from = `${S}\nCREATE TYPE app.pt AS (a int, b int);`;
    const to = `${S}\nCREATE TYPE app.pt AS (a int, c int, b int);`;
    expect(() => diffSchemas(from, to)).toThrow(/app\.pt.*attribute "c".*append/);
    const result = diffSchemas(from, to, lax);
    expect(norm(sql(result, 'deploy'))).toMatch(/ALTER TYPE app\.pt ADD ATTRIBUTE c int(eger)?/);
    expect(norm(sql(result, 'revert'))).toMatch(/ALTER TYPE app\.pt DROP ATTRIBUTE c/);
    expect(result.warnings.join('\n')).toMatch(/attribute "c".*append/);
  });

  it('resets a removed MINVALUE/MAXVALUE together with the START it implied', () => {
    const from = `${S}\nCREATE SEQUENCE app.s MINVALUE 5 MAXVALUE 1000 CACHE 10;`;
    const to = `${S}\nCREATE SEQUENCE app.s;`;
    const result = diffSchemas(from, to);
    expect(result.warnings).toEqual([]);
    const deploy = norm(sql(result, 'deploy'));
    const revert = norm(sql(result, 'revert'));
    expect(deploy).toMatch(/ALTER SEQUENCE app\.s .*NO MINVALUE/);
    expect(deploy).toMatch(/NO MAXVALUE/);
    expect(deploy).toMatch(/START WITH 1/);
    expect(deploy).toMatch(/CACHE 1\b/);
    expect(revert).toMatch(/MINVALUE 5/);
    expect(revert).toMatch(/MAXVALUE 1000/);
    expect(revert).toMatch(/START WITH 5/);
    expect(revert).toMatch(/CACHE 10/);
  });

  it('rejects a --using expression with a top-level comma or a parse error, naming the flag', () => {
    const from = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, code text);`;
    const to = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY, code int);`;
    expect(() => diffSchemas(from, to, { casts: { 'app.t.code': 'code::int, id' } })).toThrow(/--using.*single expression/);
    expect(() => diffSchemas(from, to, { casts: { 'app.t.code': 'nullif(code' } })).toThrow(/--using.*could not be parsed/);
    const ok = diffSchemas(from, to, { casts: { 'app.t.code': "nullif(code, '')::int" } });
    expect(norm(sql(ok, 'deploy'))).toMatch(/USING nullif\(code, ''\)::int(eger)?/);
  });

  it('does not re-grant when an explicit REVOKE ALL FROM PUBLIC disappears on an object PUBLIC has no default rights to', () => {
    const from = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY);\nREVOKE ALL ON TABLE app.t FROM PUBLIC;\nCREATE FUNCTION app.f() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;\nREVOKE ALL ON FUNCTION app.f() FROM PUBLIC;`;
    const to = `${S}\nCREATE TABLE app.t (id int PRIMARY KEY);\nCREATE FUNCTION app.f() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;`;
    const result = diffSchemas(from, to);
    const deploy = norm(sql(result, 'deploy'));
    expect(deploy).not.toMatch(/GRANT ALL ON (TABLE )?app\.t/);
    expect(deploy).toMatch(/GRANT ALL ON FUNCTION app\.f\(\) TO PUBLIC/);
    expect(norm(sql(result, 'revert'))).toMatch(/REVOKE ALL ON FUNCTION app\.f\(\) FROM PUBLIC/);
    // The other direction (adding the explicit revoke) is one REVOKE per object, not two.
    const back = diffSchemas(to, from);
    const backDeploy = norm(sql(back, 'deploy'));
    expect(backDeploy.match(/REVOKE ALL ON (TABLE )?app\.t FROM PUBLIC/g)).toHaveLength(1);
    expect(backDeploy.match(/REVOKE ALL ON FUNCTION app\.f\(\) FROM PUBLIC/g)).toHaveLength(1);
  });

  it('emits a single REVOKE when a grant is replaced by an explicit revoke', () => {
    const from = `${S}\nCREATE ROLE app_user;\nCREATE TABLE app.t (id int PRIMARY KEY);\nGRANT SELECT ON TABLE app.t TO app_user;`;
    const to = `${S}\nCREATE ROLE app_user;\nCREATE TABLE app.t (id int PRIMARY KEY);\nREVOKE SELECT ON TABLE app.t FROM app_user;`;
    const deploy = norm(sql(diffSchemas(from, to), 'deploy'));
    expect(deploy.match(/REVOKE SELECT ON (TABLE )?app\.t FROM app_user/g)).toHaveLength(1);
    expect(deploy).not.toMatch(/GRANT/);
  });

  it('renames a column on a table renamed in the same diff (declared with either table name)', () => {
    const from = `${S}\nCREATE TABLE app.old (id int PRIMARY KEY, col text);`;
    const to = `${S}\nCREATE TABLE app.new (id int PRIMARY KEY, name text);`;
    for (const columnSpec of ['app.old.col=app.new.name', 'app.old.col=app.old.name']) {
      const result = diffSchemas(from, to, { renames: ['app.old=app.new', columnSpec] });
      const deploy = norm(sql(result, 'deploy'));
      expect(deploy).toMatch(/ALTER TABLE app\.old RENAME TO new/);
      expect(deploy).toMatch(/ALTER TABLE app\.new RENAME (COLUMN )?col TO name/);
      expect(deploy).not.toMatch(/DROP COLUMN/);
      const revert = norm(sql(result, 'revert'));
      expect(revert).toMatch(/ALTER TABLE app\.new RENAME (COLUMN )?name TO col/);
      expect(revert).toMatch(/ALTER TABLE app\.new RENAME TO old/);
    }
    expect(() => diffSchemas(from, to, { renames: ['app.old=app.new', 'app.old.col=app.other.name'] })).toThrow(/cannot move/);
  });

  it('follows a table rename through comments, grants, views, policies and function bodies', () => {
    const body = (t: string) => [
      S,
      `CREATE TABLE app.${t} (id int PRIMARY KEY, col text);`,
      `COMMENT ON TABLE app.${t} IS 'the table';`,
      `COMMENT ON COLUMN app.${t}.col IS 'the col';`,
      `GRANT SELECT ON TABLE app.${t} TO PUBLIC;`,
      `ALTER TABLE app.${t} ENABLE ROW LEVEL SECURITY;`,
      `CREATE POLICY p ON app.${t} FOR SELECT USING (true);`,
      `CREATE VIEW app.v AS SELECT ${t}.id, ${t}.col FROM app.${t};`,
      `CREATE FUNCTION app.f() RETURNS bigint LANGUAGE sql AS $$ SELECT count(*) FROM app.${t} $$;`
    ].join('\n');
    const result = diffSchemas(body('old'), body('new'), { renames: ['app.old=app.new'] });
    expect(result.warnings).toEqual([]);
    const deploy = norm(sql(result, 'deploy'));
    expect(deploy).toMatch(/ALTER TABLE app\.old RENAME TO new/);
    expect(deploy).toMatch(/CREATE OR REPLACE FUNCTION app\.f\(\)/);
    expect(deploy).toMatch(/FROM app\.new/);
    expect(deploy).not.toMatch(/COMMENT ON/);
    expect(deploy).not.toMatch(/REVOKE|GRANT/);
    expect(deploy).not.toMatch(/DROP VIEW|CREATE (OR REPLACE )?VIEW/);
    expect(deploy).not.toMatch(/POLICY/);
  });
});
