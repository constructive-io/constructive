import { QueryBuilder } from '../src';

const read = () =>
  new QueryBuilder().schema('app_public').table('runs').select(['id', 'status']);

describe('row-level locks', () => {
  it('locks FOR UPDATE by default', () => {
    const { text, values } = read()
      .where({ id: { equalTo: 'r1' } })
      .lock()
      .build();

    expect(text).toMatch(/FOR UPDATE$/);
    expect(values).toEqual(['r1']);
  });

  it('states each lock strength as PostgreSQL spells it', () => {
    expect(read().lock('update').toSQL()).toMatch(/FOR UPDATE$/);
    expect(read().lock('noKeyUpdate').toSQL()).toMatch(/FOR NO KEY UPDATE$/);
    expect(read().lock('share').toSQL()).toMatch(/FOR SHARE$/);
    expect(read().lock('keyShare').toSQL()).toMatch(/FOR KEY SHARE$/);
  });

  it('passes over a row someone else holds, or refuses to wait for it', () => {
    expect(read().lock('update', { skipLocked: true }).toSQL()).toMatch(/FOR UPDATE SKIP LOCKED$/);
    expect(read().lock('update', { noWait: true }).toSQL()).toMatch(/FOR UPDATE NOWAIT$/);
  });

  it('refuses a lock that both skips and refuses to wait', () => {
    expect(() => read().lock('update', { skipLocked: true, noWait: true })).toThrow(
      /not both/
    );
  });

  it('locks the rows an ordered, limited read returns', () => {
    const text = read().orderBy('created_at', 'ASC').limit(1).lock().toSQL();

    expect(text).toMatch(/ORDER BY[\s\S]*LIMIT[\s\S]*FOR UPDATE$/);
  });

  it('carries the lock through a clone', () => {
    const locked = read().lock('share');

    expect(locked.clone().toSQL()).toMatch(/FOR SHARE$/);
    expect(read().toSQL()).not.toMatch(/FOR/);
  });
});
