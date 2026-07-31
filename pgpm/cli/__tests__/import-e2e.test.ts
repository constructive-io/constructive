/**
 * e2e for `pgpm import` against live Postgres: a pg_dump-style example dump
 * (psql \\restrict/\\unrestrict meta-commands, session SET noise, OWNER TO) is
 * imported at object granularity, deployed, verified, and reverted clean.
 *
 * PREREQUISITES: a running PostgreSQL instance via standard PG* env vars.
 */
import * as fs from 'fs';
import * as path from 'path';
import { teardownPgPools } from 'pg-cache';

import { CLIDeployTestFixture } from '../test-utils';

jest.setTimeout(120000);

afterAll(async () => {
  await teardownPgPools();
});

const WS = 'import-ws';
const MODULE_NAME = 'import-e2e';

/** Example pg_dump --schema-only output shape (plain format). */
const DUMP_SQL = `--
-- PostgreSQL database dump
--

\\restrict 8fKz01Lm3q

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: imp_app; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA imp_app;

ALTER SCHEMA imp_app OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: imp_app; Owner: postgres
--

CREATE TABLE imp_app.users (
    id integer NOT NULL,
    email text NOT NULL
);

ALTER TABLE imp_app.users OWNER TO postgres;

--
-- Name: notes; Type: TABLE; Schema: imp_app; Owner: postgres
--

CREATE TABLE imp_app.notes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    body text
);

ALTER TABLE imp_app.notes OWNER TO postgres;

--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: imp_app; Owner: postgres
--

ALTER TABLE ONLY imp_app.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: imp_app; Owner: postgres
--

ALTER TABLE ONLY imp_app.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);

--
-- Name: notes notes_user_id_fkey; Type: FK CONSTRAINT; Schema: imp_app; Owner: postgres
--

ALTER TABLE ONLY imp_app.notes
    ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES imp_app.users(id);

--
-- Name: notes_user_id_idx; Type: INDEX; Schema: imp_app; Owner: postgres
--

CREATE INDEX notes_user_id_idx ON imp_app.notes USING btree (user_id);

\\unrestrict 8fKz01Lm3q

--
-- PostgreSQL database dump complete
--
`;

describe('pgpm import e2e', () => {
  let fixture: CLIDeployTestFixture;
  let wsDir: string;

  beforeAll(async () => {
    fixture = new CLIDeployTestFixture();
    wsDir = path.join(fixture.tempFixtureDir, WS);
    fs.mkdirSync(wsDir, { recursive: true });
    fs.writeFileSync(path.join(wsDir, 'pgpm.json'), '{\n    "packages": [\n        "*"\n    ]\n}');
    fs.writeFileSync(path.join(wsDir, `${MODULE_NAME}.sql`), DUMP_SQL);
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it('--dry-run prints derived changes without writing', async () => {
    await fixture.runTerminalCommands(
      `
      cd ${WS}
      pgpm import ${MODULE_NAME}.sql --granularity object --dry-run
      `,
      {}
    );
    expect(fs.existsSync(path.join(wsDir, MODULE_NAME))).toBe(false);
  });

  it('imports the dump into a complete pgpm module', async () => {
    await fixture.runTerminalCommands(
      `
      cd ${WS}
      pgpm import ${MODULE_NAME}.sql --granularity object
      `,
      {}
    );

    const moduleDir = path.join(wsDir, MODULE_NAME);
    expect(fs.existsSync(path.join(moduleDir, 'pgpm.plan'))).toBe(true);
    expect(fs.existsSync(path.join(moduleDir, `${MODULE_NAME}.control`))).toBe(true);

    const plan = fs.readFileSync(path.join(moduleDir, 'pgpm.plan'), 'utf-8');
    expect(plan).toContain('schemas/imp_app/schema');
    expect(plan).toContain('tables/users/table');
    expect(plan).toContain('tables/notes/table');

    // psql/session/ownership noise must not leak into deploy scripts
    const deployDir = path.join(moduleDir, 'deploy');
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
        entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]
      );
    for (const file of walk(deployDir)) {
      const sql = fs.readFileSync(file, 'utf-8');
      expect(sql).not.toContain('\\restrict');
      expect(sql).not.toContain('OWNER TO');
      expect(sql).not.toContain('set_config');
    }
  });

  it('deploys, verifies, and reverts the imported module cleanly', async () => {
    const testDb = await fixture.setupTestDatabase();

    await fixture.runTerminalCommands(
      `
      cd ${WS}/${MODULE_NAME}
      pgpm deploy --database ${testDb.name} --package ${MODULE_NAME} --yes
      `,
      { database: testDb.name }
    );

    expect(await testDb.exists('schema', 'imp_app')).toBe(true);
    expect(await testDb.exists('table', 'imp_app.users')).toBe(true);
    expect(await testDb.exists('table', 'imp_app.notes')).toBe(true);

    const fk = await testDb.query(
      `SELECT conname FROM pg_constraint WHERE conname = 'notes_user_id_fkey'`
    );
    expect(fk.rows).toHaveLength(1);

    const idx = await testDb.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'imp_app' AND indexname = 'notes_user_id_idx'`
    );
    expect(idx.rows).toHaveLength(1);

    await fixture.runTerminalCommands(
      `
      cd ${WS}/${MODULE_NAME}
      pgpm verify --database ${testDb.name} --package ${MODULE_NAME} --yes
      pgpm revert --database ${testDb.name} --package ${MODULE_NAME} --yes
      `,
      { database: testDb.name }
    );

    expect(await testDb.exists('schema', 'imp_app')).toBe(false);
    const remaining = await testDb.query(
      `SELECT COUNT(*)::int AS count FROM pgpm_migrate.changes WHERE package = $1`,
      [MODULE_NAME]
    );
    expect(remaining.rows[0].count).toBe(0);
  });
});
