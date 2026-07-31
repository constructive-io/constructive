import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { loadDumpSource, sanitizeDumpSql } from '../src/dump-source';

const PG_DUMP_SAMPLE = `--
-- PostgreSQL database dump
--

\\restrict hK3jf82Klm

-- Dumped from database version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET row_security = off;

CREATE SCHEMA app;

ALTER SCHEMA app OWNER TO postgres;

CREATE TABLE app.users (
    id integer NOT NULL,
    email text NOT NULL
);

ALTER TABLE app.users OWNER TO postgres;

ALTER TABLE ONLY app.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

\\unrestrict hK3jf82Klm

--
-- PostgreSQL database dump complete
--
`;

describe('sanitizeDumpSql', () => {
  it('strips psql meta-commands, SET/set_config noise, and OWNER TO', () => {
    const { sql, warnings } = sanitizeDumpSql(PG_DUMP_SAMPLE);

    expect(sql).not.toContain('\\restrict');
    expect(sql).not.toContain('\\unrestrict');
    expect(sql).not.toContain('SET statement_timeout');
    expect(sql).not.toContain('set_config');
    expect(sql).not.toContain('OWNER TO');

    expect(sql).toContain('CREATE SCHEMA app;');
    expect(sql).toContain('CREATE TABLE app.users');
    expect(sql).toContain('ADD CONSTRAINT users_pkey PRIMARY KEY (id);');

    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('psql meta-command'),
        expect.stringContaining('session SET statement'),
        expect.stringContaining('set_config'),
        expect.stringContaining('OWNER TO')
      ])
    );
  });

  it('keeps SET-like tokens inside multi-line statements', () => {
    const body = [
      'CREATE FUNCTION app.touch() RETURNS trigger AS $$',
      'BEGIN',
      '  UPDATE app.users SET email = NEW.email WHERE id = NEW.id;',
      '  RETURN NEW;',
      'END $$ LANGUAGE plpgsql;'
    ].join('\n');
    const { sql } = sanitizeDumpSql(body);
    expect(sql).toBe(body);
  });

  it('passes plain SQL through unchanged with no warnings', () => {
    const { sql, warnings } = sanitizeDumpSql('CREATE SCHEMA app;\n');
    expect(sql).toBe('CREATE SCHEMA app;');
    expect(warnings).toEqual([]);
  });
});

describe('loadDumpSource', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pgpm-dump-source-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('derives the module name from the file name', () => {
    const file = join(dir, 'my-app.sql');
    writeFileSync(file, PG_DUMP_SAMPLE);
    const source = loadDumpSource(file);
    expect(source.name).toBe('my-app');
    expect(source.sql).toContain('CREATE TABLE app.users');
  });

  it('honors an explicit name override', () => {
    const file = join(dir, 'raw.sql');
    writeFileSync(file, 'CREATE SCHEMA app;');
    expect(loadDumpSource(file, 'renamed').name).toBe('renamed');
  });

  it('throws on a missing file', () => {
    expect(() => loadDumpSource(join(dir, 'nope.sql'))).toThrow(/not found/);
  });
});
