import {
  EMPTY_SEARCH_PATH_STATEMENT,
  rewriteSearchPathStatement
} from '../../src/dump/search-path';

const preamble = (body: string) =>
  ['SET client_encoding = \'UTF8\';', body, 'SET row_security = off;'].join('\n');

describe('rewriteSearchPathStatement', () => {
  it('names the extension schemas in the order given', () => {
    const out = rewriteSearchPathStatement(preamble(EMPTY_SEARCH_PATH_STATEMENT), [
      'extensions',
      'public'
    ]);
    expect(out).toContain(
      'SELECT pg_catalog.set_config(\'search_path\', \'"extensions", "public"\', false);'
    );
    expect(out).not.toContain(EMPTY_SEARCH_PATH_STATEMENT);
  });

  it('quotes schema names that need it', () => {
    const out = rewriteSearchPathStatement(preamble(EMPTY_SEARCH_PATH_STATEMENT), ['My Ext']);
    expect(out).toContain('SELECT pg_catalog.set_config(\'search_path\', \'"My Ext"\', false);');
  });

  it('leaves the empty path alone when the database has no extensions', () => {
    const dump = preamble(EMPTY_SEARCH_PATH_STATEMENT);
    expect(rewriteSearchPathStatement(dump, [])).toBe(dump);
  });

  it('throws rather than emitting a dump it could not patch', () => {
    expect(() =>
      rewriteSearchPathStatement(preamble('SET search_path = public;'), ['public'])
    ).toThrow(/does not contain the expected preamble/);
  });
});
