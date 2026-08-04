import { readFileSync } from 'fs';
import { join } from 'path';

import { generatedRegistry } from '../src/generated/registry.generated';
import { getDefinition } from '../src/registry';

const inventory: Record<string, unknown> = JSON.parse(
  readFileSync(join(__dirname, '../scripts/db-error-inventory.json'), 'utf-8')
);

/**
 * The generated registry is the only thing standing between a database refusal
 * and a silent 500, so a refreshed inventory that was never regenerated (or the
 * reverse) has to fail here rather than in production.
 */
describe('generated registry is in sync with the audit inventory', () => {
  it('covers every audited code', () => {
    const missing = Object.keys(inventory).filter(code => !generatedRegistry[code]);
    expect(missing).toEqual([]);
  });

  it('carries no code the audit no longer knows about', () => {
    const stale = Object.keys(generatedRegistry).filter(code => !(code in inventory));
    expect(stale).toEqual([]);
  });

  it('gives every audited code a resolvable HTTP status', () => {
    const unstatused = Object.keys(inventory).filter(
      code => typeof getDefinition(code)?.http !== 'number'
    );
    expect(unstatused).toEqual([]);
  });
});
