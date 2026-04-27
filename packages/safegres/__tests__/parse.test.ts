import { parsePolicyExpression } from '../src/ast/parse';
import { columnRefPath, findAll, funcNameQualified } from '../src/ast/walk';

describe('parsePolicyExpression', () => {
  it('returns null on empty / null', async () => {
    expect(await parsePolicyExpression(null)).toBeNull();
    expect(await parsePolicyExpression('')).toBeNull();
    expect(await parsePolicyExpression('   ')).toBeNull();
  });

  it('parses a simple column = fn() predicate', async () => {
    const p = await parsePolicyExpression('(owner_id = my_auth.current_user_id())');
    expect(p).not.toBeNull();
    const funcs = findAll(p!.ast, 'FuncCall');
    expect(funcs.length).toBe(1);
    expect(funcNameQualified(funcs[0])).toBe('my_auth.current_user_id');
  });

  it('parses pg_get_expr-style output with double parens', async () => {
    const p = await parsePolicyExpression('((actor_id IS NOT NULL))');
    expect(p).not.toBeNull();
  });

  it('walks ColumnRef fields', async () => {
    const p = await parsePolicyExpression('(s.actor_id = 1)');
    const refs = findAll(p!.ast, 'ColumnRef');
    expect(refs.length).toBeGreaterThan(0);
    expect(columnRefPath(refs[0])).toEqual(['s', 'actor_id']);
  });
});
