import { loadModule } from 'plpgsql-parser';

import { classifyScript, isStubScript, regenerateScripts } from '../src/regen';

beforeAll(async () => {
  await loadModule();
});

describe('isStubScript', () => {
  it('treats empty and whitespace-only content as stubs', () => {
    expect(isStubScript('')).toBe(true);
    expect(isStubScript('   \n\n  ')).toBe(true);
  });

  it('treats comment-only scaffolds as stubs', () => {
    expect(isStubScript('-- Revert: foo\n\n-- Add your revert SQL here\n')).toBe(true);
    expect(isStubScript('/* block\ncomment */\n-- line comment\n')).toBe(true);
  });

  it('treats header + bare transaction wrapper as a stub', () => {
    expect(
      isStubScript('-- Revert foo from pg\n\nBEGIN;\n\n-- Add your revert SQL here\n\nCOMMIT;\n')
    ).toBe(true);
    expect(isStubScript('-- Verify foo on pg\n\nBEGIN;\n\nROLLBACK;\n')).toBe(true);
  });

  it('does not treat substantive statements as stubs', () => {
    expect(isStubScript('-- Revert foo from pg\nBEGIN;\nDROP TABLE app.users;\nCOMMIT;\n')).toBe(false);
    expect(isStubScript('SELECT 1/COUNT(*) FROM information_schema.tables;')).toBe(false);
  });

  it('does not treat unparseable content as a stub', () => {
    expect(isStubScript('THIS IS NOT ((( SQL')).toBe(false);
  });
});

describe('classifyScript', () => {
  it('excludes transaction control statements', () => {
    const facts = classifyScript('BEGIN;\nCREATE SCHEMA app;\nCOMMIT;');
    expect(facts).toHaveLength(1);
    expect(facts[0].kind).toBe('schema');
  });
});

describe('regenerateScripts', () => {
  const DEPLOY = [
    'CREATE SCHEMA app;',
    'CREATE TABLE app.users (id serial PRIMARY KEY);',
    'ALTER TABLE app.users ADD COLUMN email text;',
    'ALTER TABLE app.users ADD CONSTRAINT users_email_key UNIQUE (email);',
    'CREATE INDEX users_email_idx ON app.users (email);',
    'CREATE FUNCTION app.touch() RETURNS trigger AS $$ BEGIN RETURN NEW; END $$ LANGUAGE plpgsql;',
    'CREATE TRIGGER users_touch BEFORE UPDATE ON app.users FOR EACH ROW EXECUTE FUNCTION app.touch();',
    'ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;',
    'CREATE POLICY users_self ON app.users FOR SELECT USING (true);',
    'GRANT SELECT ON app.users TO PUBLIC;'
  ].join('\n');

  it('generates revert as inverses in reverse order', () => {
    const { revert } = regenerateScripts(DEPLOY);
    expect(revert.warnings).toEqual([]);
    const sql = revert.sql;
    expect(sql).toContain('DROP TABLE app.users');
    expect(sql).toContain('DROP SCHEMA app');
    expect(sql).toContain('DROP POLICY users_self ON app.users');
    expect(sql).toContain('DROP TRIGGER users_touch ON app.users');
    expect(sql).toContain('DROP FUNCTION app.touch()');
    expect(sql).toContain('DROP INDEX app.users_email_idx');
    expect(sql.indexOf('DROP TABLE app.users')).toBeLessThan(sql.indexOf('DROP SCHEMA app'));
    expect(sql.indexOf('DROP TRIGGER users_touch')).toBeLessThan(sql.indexOf('DROP TABLE app.users'));
  });

  it('generates verify existence checks per created object', () => {
    const { verify } = regenerateScripts(DEPLOY);
    expect(verify.warnings).toEqual([]);
    const sql = verify.sql;
    expect(sql).toContain("schema_name = 'app'");
    expect(sql).toContain("to_regclass('app.users')");
    expect(sql).toContain("column_name = 'email'");
    expect(sql).toContain("to_regclass('app.users_email_idx')");
    expect(sql).toContain("to_regprocedure('app.touch()')");
    expect(sql).toContain("tgname = 'users_touch'");
    expect(sql).toContain("policyname = 'users_self'");
    expect(sql).toContain("has_table_privilege('public', 'app.users', 'SELECT')");
  });

  it('ignores a BEGIN/COMMIT wrapper in the deploy script', () => {
    const wrapped = `-- Deploy schemas/app/schema to pg\n\nBEGIN;\n\nCREATE SCHEMA app;\n\nCOMMIT;\n`;
    const { revert, verify } = regenerateScripts(wrapped);
    expect(revert.sql.trim()).toBe('DROP SCHEMA app;');
    expect(revert.warnings).toEqual([]);
    expect(verify.warnings).toEqual([]);
  });

  it('surfaces non-derivable statements as comments plus warnings', () => {
    const { revert } = regenerateScripts('INSERT INTO app.users (email) VALUES (\'a@b.c\');');
    expect(revert.sql).toContain('-- revert not derivable:');
    expect(revert.warnings.length).toBeGreaterThan(0);
  });
});
