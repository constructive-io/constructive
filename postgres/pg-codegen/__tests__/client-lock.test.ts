/**
 * The lock a read states reaches the SQL the client sends. Asserted against a
 * capturing connection rather than a database: what matters is the statement.
 */
import { createCodegenTestDb } from '../__fixtures__/generated/codegen_test/db';

const capture = () => {
  const statements: string[] = [];
  const db = createCodegenTestDb({
    query: async (text: string) => {
      statements.push(text);
      return { rows: [] };
    }
  });
  return { db, statements };
};

it('takes no lock unless the read asks for one', async () => {
  const { db, statements } = capture();
  await db.agentRuns.findFirst({ where: { id: 'r1' } });
  expect(statements[0]).not.toMatch(/FOR /);
});

it('locks the row a read-then-write is about to update', async () => {
  const { db, statements } = capture();
  await db.agentRuns.findFirst({ where: { id: 'r1' }, lock: 'update' });
  expect(statements[0]).toMatch(/LIMIT 1\s+FOR UPDATE$/);
});

it('states what to do about a row another transaction holds', async () => {
  const { db, statements } = capture();
  await db.agentRuns.findMany({
    where: { status: 'queued' },
    lock: { strength: 'update', skipLocked: true }
  });
  await db.agentRuns.findMany({ lock: { strength: 'share', noWait: true } });
  expect(statements[0]).toMatch(/FOR UPDATE SKIP LOCKED$/);
  expect(statements[1]).toMatch(/FOR SHARE NOWAIT$/);
});
