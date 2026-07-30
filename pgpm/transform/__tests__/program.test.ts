import { loadModule } from 'plpgsql-parser';

import { emitSqlProgram, parseSqlProgram } from '../src/program';

beforeAll(async () => {
  await loadModule();
});

const script = `-- Deploy header comment
CREATE SCHEMA app;

CREATE TABLE app.users (
  id uuid PRIMARY KEY
);

-- trailing note
GRANT SELECT ON app.users TO authenticated;
`;

describe('parseSqlProgram', () => {
  it('parses once into statements with facts, spans and verbatim raw text', () => {
    const program = parseSqlProgram(script);
    expect(program.statements).toHaveLength(3);

    const [schema, table, grant] = program.statements;
    expect(schema.facts.kind).toBe('schema');
    expect(table.facts.kind).toBe('table');
    expect(grant.facts.kind).toBe('grant');

    for (const stmt of program.statements) {
      expect(stmt.dirty).toBe(false);
      expect(stmt.raw).toBe(script.slice(stmt.span.start, stmt.span.start + stmt.span.len));
      expect(stmt.raw.trim().length).toBeGreaterThan(0);
    }
    expect(table.raw).toContain('CREATE TABLE app.users');
    expect(table.facts.creates).toContainEqual({ schema: 'app', name: 'users' });
  });
});

describe('emitSqlProgram', () => {
  it('emits byte-identical source when nothing is dirty', () => {
    const program = parseSqlProgram(script);
    expect(emitSqlProgram(program)).toBe(script);
  });

  it('deparses only dirty statements and preserves every other byte', () => {
    const program = parseSqlProgram(script);
    const table = program.statements[1];
    table.stmt.CreateStmt.relation.schemaname = 'tenant';
    table.dirty = true;

    const out = emitSqlProgram(program);
    expect(out).toContain('-- Deploy header comment');
    expect(out).toContain('-- trailing note');
    expect(out).toContain('CREATE SCHEMA app;');
    expect(out).toContain('GRANT SELECT ON app.users TO authenticated;');
    expect(out).toContain('tenant.users');
    expect(out).not.toContain('CREATE TABLE app.users');
  });

  it('round-trips a mutated statement through a reparse', () => {
    const program = parseSqlProgram(script);
    program.statements[0].stmt.CreateSchemaStmt.schemaname = 'tenant';
    program.statements[0].dirty = true;
    const out = emitSqlProgram(program);

    const reparsed = parseSqlProgram(out);
    expect(reparsed.statements[0].facts.creates).toContainEqual({ schema: null, name: 'tenant' });
    expect(reparsed.statements).toHaveLength(3);
  });
});
