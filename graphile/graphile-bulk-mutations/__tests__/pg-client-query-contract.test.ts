import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const plugins = [
  'BulkInsertPlugin',
  'BulkUpsertPlugin',
  'BulkUpdatePlugin',
  'BulkDeletePlugin'
] as const;

describe.each(plugins)('%s PgClient query contract', (plugin) => {
  const source = readFileSync(
    join(__dirname, '..', 'src', 'plugins', `${plugin}.ts`),
    'utf8'
  );

  it('types the callback as the @dataplan/pg PgClient', () => {
    expect(source).toContain('pgClient: PgClient');
  });

  it('uses object-form query arguments instead of node-postgres positional arguments', () => {
    const queryCall = String.raw`pgClient\.query(?:<[^)]+>)?\(`;
    expect(source).toMatch(new RegExp(`${queryCall}\\s*\\{`));
    expect(source).not.toMatch(new RegExp(`${queryCall}\\s*(?:\`|'|")`));
    expect(source).not.toMatch(
      new RegExp(`${queryCall}\\s*[A-Za-z_$][\\w$]*\\s*,`)
    );
  });
});
