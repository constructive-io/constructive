import { getConnections, PgTestClient } from 'pgsql-test';

import { introspectViews } from '../src/pg/indexes';

jest.setTimeout(120000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
  // `security_invoker` is a boolean reloption, so every spelling Postgres
  // accepts for a boolean is legal here and is stored verbatim in reloptions.
  await pg.any(`
    CREATE SCHEMA fx_viewopt;
    CREATE TABLE fx_viewopt.t (id int);
    CREATE VIEW fx_viewopt.v_true  WITH (security_invoker = true)   AS SELECT id FROM fx_viewopt.t;
    CREATE VIEW fx_viewopt.v_quoted WITH (security_invoker = 'true') AS SELECT id FROM fx_viewopt.t;
    CREATE VIEW fx_viewopt.v_on    WITH (security_invoker = on)     AS SELECT id FROM fx_viewopt.t;
    CREATE VIEW fx_viewopt.v_one   WITH (security_invoker = 1)      AS SELECT id FROM fx_viewopt.t;
    CREATE VIEW fx_viewopt.v_yes   WITH (security_invoker = 'yes')  AS SELECT id FROM fx_viewopt.t;
    CREATE VIEW fx_viewopt.v_bare  WITH (security_invoker)          AS SELECT id FROM fx_viewopt.t;
    CREATE VIEW fx_viewopt.v_off   WITH (security_invoker = off)    AS SELECT id FROM fx_viewopt.t;
    CREATE VIEW fx_viewopt.v_none                                   AS SELECT id FROM fx_viewopt.t;

    CREATE SCHEMA fx_viewwrite;
    CREATE TABLE fx_viewwrite.t (id int);
    CREATE TABLE fx_viewwrite.audit (note text);
    -- Auto-updatable: a simple view over one relation.
    CREATE VIEW fx_viewwrite.v_auto AS SELECT id FROM fx_viewwrite.t;
    -- Not updatable: an aggregate has no row to write back.
    CREATE VIEW fx_viewwrite.v_agg AS SELECT count(*) AS n FROM fx_viewwrite.t;
    -- Updatable only through a rule, which pg_get_viewdef does not show.
    CREATE VIEW fx_viewwrite.v_ruled AS SELECT id FROM fx_viewwrite.t;
    CREATE RULE v_ruled_ins AS ON INSERT TO fx_viewwrite.v_ruled
      DO INSTEAD INSERT INTO fx_viewwrite.audit (note) VALUES ('x');
    CREATE RULE v_ruled_del AS ON DELETE TO fx_viewwrite.v_ruled DO INSTEAD NOTHING;

    CREATE SCHEMA fx_viewtrig;
    CREATE TABLE fx_viewtrig.t (id int);
    CREATE FUNCTION fx_viewtrig.tg() RETURNS trigger LANGUAGE plpgsql AS $fn$
      BEGIN INSERT INTO fx_viewtrig.t (id) VALUES (NEW.id); RETURN NEW; END
    $fn$;
    CREATE VIEW fx_viewtrig.v AS SELECT id FROM fx_viewtrig.t;
    CREATE TRIGGER v_ins INSTEAD OF INSERT ON fx_viewtrig.v
      FOR EACH ROW EXECUTE FUNCTION fx_viewtrig.tg();
    -- One trigger, several events: the type bits carry all of them at once.
    CREATE TRIGGER v_upd_del INSTEAD OF UPDATE OR DELETE ON fx_viewtrig.v
      FOR EACH ROW EXECUTE FUNCTION fx_viewtrig.tg();

    CREATE SCHEMA fx_viewbarrier;
    CREATE TABLE fx_viewbarrier.t (id int, owner_name text);
    CREATE VIEW fx_viewbarrier.v_plain AS
      SELECT id FROM fx_viewbarrier.t WHERE owner_name = CURRENT_USER;
    CREATE VIEW fx_viewbarrier.v_barrier WITH (security_barrier = true) AS
      SELECT id FROM fx_viewbarrier.t WHERE owner_name = CURRENT_USER;
    -- Both reloptions at once: reading one must not disturb the other.
    CREATE VIEW fx_viewbarrier.v_both WITH (security_barrier = on, security_invoker = 1) AS
      SELECT id FROM fx_viewbarrier.t;
    CREATE MATERIALIZED VIEW fx_viewbarrier.mv AS SELECT id FROM fx_viewbarrier.t;

    CREATE SCHEMA fx_viewcols;
    CREATE TABLE fx_viewcols.people (id int, email text, ssn text, note text);
    CREATE VIEW fx_viewcols.v_narrow AS SELECT id, email FROM fx_viewcols.people;
    CREATE VIEW fx_viewcols.v_star AS SELECT * FROM fx_viewcols.people;
    -- A column used only in the WHERE clause never appears in the output,
    -- but the view still reads it.
    CREATE VIEW fx_viewcols.v_filtered AS
      SELECT id FROM fx_viewcols.people WHERE ssn IS NOT NULL;
    -- A nested view depends on the inner *view's* columns, not the table's.
    CREATE VIEW fx_viewcols.v_nested AS SELECT email FROM fx_viewcols.v_narrow;
  `);
});

afterAll(async () => {
  if (teardown) await teardown();
});

describe('introspectViews — security_invoker spellings', () => {
  it('reads every boolean spelling, not just the literal string "true"', async () => {
    const views = await introspectViews(pg.client as never, { schemas: ['fx_viewopt'] });
    const invoker = Object.fromEntries(views.map((v) => [v.name, v.securityInvoker]));
    expect(invoker).toEqual({
      v_true: true,
      v_quoted: true,
      v_on: true,
      v_one: true,
      v_yes: true,
      v_bare: true,
      v_off: false,
      v_none: false
    });
  });
});

describe('introspectViews — write paths', () => {
  it('reads updatability and the rules pg_get_viewdef does not show', async () => {
    const views = await introspectViews(pg.client as never, { schemas: ['fx_viewwrite'] });
    const byName = Object.fromEntries(views.map((v) => [v.name, v]));

    expect(byName.v_auto.writable.sort()).toEqual(['DELETE', 'INSERT', 'UPDATE']);
    expect(byName.v_auto.rules).toEqual([]);
    expect(byName.v_auto.insteadOfTriggers).toBe(false);

    expect(byName.v_agg.writable).toEqual([]);

    // The bitmask counts rule-conferred updatability too, which is why the
    // rules have to be read alongside it rather than inferred from it.
    expect(byName.v_ruled.writable).toContain('INSERT');
    expect(byName.v_ruled.rules.map((r) => [r.name, r.event, r.instead]).sort()).toEqual([
      ['v_ruled_del', 'DELETE', true],
      ['v_ruled_ins', 'INSERT', true]
    ]);
    expect(byName.v_ruled.rules[0].definition).toContain('CREATE RULE');
  });
});

describe('introspectViews — INSTEAD OF triggers', () => {
  it('reads which function each trigger runs, and on which events', async () => {
    const views = await introspectViews(pg.client as never, { schemas: ['fx_viewtrig'] });
    const v = views.find((view) => view.name === 'v')!;

    expect(v.insteadOfTriggers).toBe(true);
    // Which function is the whole point: whether the write escalates depends
    // on *that function's* security attribute, not on the view's.
    expect(v.insteadOf.map((t) => [t.name, t.functionSchema, t.functionName, t.events.sort()]))
      .toEqual([
        ['v_ins', 'fx_viewtrig', 'tg', ['INSERT']],
        ['v_upd_del', 'fx_viewtrig', 'tg', ['DELETE', 'UPDATE']]
      ]);
  });

  it('leaves a view with no INSTEAD OF triggers with an empty list', async () => {
    const views = await introspectViews(pg.client as never, { schemas: ['fx_viewwrite'] });
    expect(views.find((v) => v.name === 'v_auto')!.insteadOf).toEqual([]);
  });
});

describe('introspectViews — column dependencies', () => {
  it('reads which columns of a base relation a view body actually touches', async () => {
    const views = await introspectViews(pg.client as never, { schemas: ['fx_viewcols'] });
    const deps = (name: string, table: string): string[] | undefined =>
      views
        .find((v) => v.name === name)
        ?.columnDeps?.find((d) => d.schema === 'fx_viewcols' && d.table === table)?.columns;

    expect(deps('v_narrow', 'people')).toEqual(['email', 'id']);
    // `*` is expanded at CREATE time, so the catalog knows the real set.
    expect(deps('v_star', 'people')).toEqual(['email', 'id', 'note', 'ssn']);
    // Read is read: a qual column escapes as surely as a projected one.
    expect(deps('v_filtered', 'people')).toEqual(['id', 'ssn']);

    // Per hop: the outer view depends on the inner view, and the inner view
    // is what depends on the table.
    expect(deps('v_nested', 'people')).toBeUndefined();
    expect(deps('v_nested', 'v_narrow')).toEqual(['email']);
  });
});

describe('introspectViews — security_barrier and materialization', () => {
  it('reads the barrier flag independently of security_invoker', async () => {
    const views = await introspectViews(pg.client as never, { schemas: ['fx_viewbarrier'] });
    const byName = Object.fromEntries(views.map((v) => [v.name, v]));

    expect(byName.v_plain.securityBarrier).toBe(false);
    expect(byName.v_barrier.securityBarrier).toBe(true);
    expect(byName.v_both).toMatchObject({ securityBarrier: true, securityInvoker: true });

    // A matview carries neither option — both are view-only reloptions — and
    // that is precisely why it cannot be made to execute as its reader.
    expect(byName.mv).toMatchObject({
      materialized: true,
      securityBarrier: false,
      securityInvoker: false
    });
  });
});
