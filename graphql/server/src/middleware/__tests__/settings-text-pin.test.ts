import { readFileSync } from 'fs';

import { SETTINGS_QUERY_TEXT } from '../rewrite-pool';

/**
 * Pins SETTINGS_QUERY_TEXT against the INSTALLED @dataplan/pg adaptor source.
 *
 * The rewriting pool classifies the adaptor's pgSettings statement by exact
 * text equality (defense against user bind values that merely contain the
 * pool_schemas GUC substring). If a dependency bump changes the emitted
 * statement, classification silently stops matching: applySettings never runs,
 * no checkout ever gets a tenant mapping, and every pooled data query fails
 * closed. That is the SAFE direction, but it disables pooling entirely and
 * only surfaces at runtime — this test makes the drift fail loudly here
 * instead. Mirrors the pg-introspection pinning approach in
 * introspection-filter.test.ts.
 */
describe('SETTINGS_QUERY_TEXT pins the installed @dataplan/pg adaptor', () => {
  it('the adaptor source still emits the exact statement we byte-match', () => {
    const adaptorPath = require.resolve('@dataplan/pg/adaptors/pg');
    const source = readFileSync(adaptorPath, 'utf8');
    expect(source).toContain(SETTINGS_QUERY_TEXT);
  });
});
