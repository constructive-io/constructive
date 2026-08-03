import { classifyStatements } from '@pgsql/semantics';
import { loadModule } from 'plpgsql-parser';

import { sliceStatementBytes, sqlSourceBytes } from '../src/byte-slice';
import { diffSchemas } from '../src/semantic-diff-driver';

beforeAll(async () => {
  await loadModule();
});

// A COMMENT whose literal contains a multibyte em dash, followed by more
// statements. libpg-query reports statement spans as UTF-8 byte offsets, so
// slicing the JS (UTF-16) string directly mis-cuts every statement after the
// em dash — `COMMENT ON` reappears as `MMENT ON` and fails to reparse.
const MULTIBYTE = [
  'CREATE SCHEMA app;',
  'CREATE TABLE app.users (id uuid PRIMARY KEY, scope text);',
  "COMMENT ON COLUMN app.users.scope IS 'Origin scope: platform, org, app — where created';",
  'CREATE TABLE app.posts (id uuid PRIMARY KEY);',
  "COMMENT ON TABLE app.posts IS 'Posts — authored content';"
].join('\n');

describe('sliceStatementBytes', () => {
  it('recovers every statement text exactly, past a multibyte character', () => {
    const bytes = sqlSourceBytes(MULTIBYTE);
    const facts = classifyStatements(MULTIBYTE);
    const texts = facts.map(f => sliceStatementBytes(bytes, f.span.start, f.span.len).trim());

    // The statement after the em dash must start at COMMENT, not a mid-word cut.
    // (libpg-query spans exclude the trailing semicolon.)
    expect(texts[3]).toBe('CREATE TABLE app.posts (id uuid PRIMARY KEY)');
    expect(texts[4]).toBe("COMMENT ON TABLE app.posts IS 'Posts — authored content'");
    for (const t of texts) expect(t.startsWith('MMENT') || t.startsWith('REATE')).toBe(false);
  });

  it('naive JS-string slicing is what would mis-cut (guards the regression)', () => {
    const facts = classifyStatements(MULTIBYTE);
    const naive = MULTIBYTE.slice(facts[4].span.start, facts[4].span.start + facts[4].span.len);
    // The em dash (3 bytes / 1 JS char) shifts the byte-offset span two code
    // units past the real start, so the naive slice loses the leading "CO".
    expect(naive.startsWith('COMMENT')).toBe(false);
  });
});

describe('diffSchemas with multibyte source', () => {
  it('diffs a script containing a multibyte comment without a parse error', () => {
    const to = `${MULTIBYTE}\nCREATE TABLE app.tags (id uuid PRIMARY KEY);`;
    const result = diffSchemas(MULTIBYTE, to);
    expect(result.objects).toContainEqual(
      expect.objectContaining({ delta: 'added', path: 'schemas/app/tables/tags/table' })
    );
  });

  it('is identical to itself when a multibyte comment is present', () => {
    const result = diffSchemas(MULTIBYTE, MULTIBYTE);
    expect(result.identical).toBe(true);
  });
});
