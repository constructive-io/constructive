import { resolve } from 'path';

import { auditPgpmWorkspace } from '../src/pgpm-test';

jest.setTimeout(120000);

const fixture = resolve(
  __dirname,
  '../../../__fixtures__/sqitch/simple/packages/my-third'
);

describe('auditPgpmWorkspace', () => {
  it('deploys the pgpm module into an ephemeral db and audits it', async () => {
    const report = await auditPgpmWorkspace({
      cwd: fixture,
      exposure: { schemas: ['mythirdapp'] }
    });
    expect(report.score).toBeDefined();
    expect(report.exposure).toMatchObject({
      known: true,
      source: 'config',
      schemas: ['mythirdapp']
    });
    expect(report.findings.some((f) => f.code === 'W1')).toBe(false);
    // mythirdapp.customers has no grants and no RLS → nothing exposed leaks.
    expect(report.score!.grade).toBe('A+');
  });

  it('reports unknown exposure (W1 + cap) when none is configured', async () => {
    const report = await auditPgpmWorkspace({ cwd: fixture });
    expect(report.exposure).toMatchObject({ known: false, source: 'none' });
    expect(report.findings.some((f) => f.code === 'W1')).toBe(true);
  });
});
