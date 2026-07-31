import { renameInPlanContent } from '../src/plan-rename';

const PLAN = `%syntax-version=1.0.0
%project=my-module
%uri=my-module

schemas/my-app/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # add schema
schemas/my-app/tables/users [schemas/my-app/schema] 2024-01-01T00:00:01Z Dev <dev@example.com> # add users
schemas/my-app/tables/posts [schemas/my-app/schema schemas/my-app/tables/users] 2024-01-01T00:00:02Z Dev <dev@example.com> # add posts
schemas/other/functions/fn [schemas/my-app/tables/users auth:schemas/auth/tables/users] 2024-01-01T00:00:03Z Dev <dev@example.com> # fn
@v1.0.0 2024-01-01T00:00:04Z Dev <dev@example.com> # release
`;

describe('renameInPlanContent', () => {
  it('rewrites change names and plain dependency refs, preserving format', () => {
    const renames = new Map([['schemas/my-app/tables/users', 'schemas/my_app/tables/users']]);
    const out = renameInPlanContent(PLAN, renames);
    expect(out).toContain('schemas/my_app/tables/users [schemas/my-app/schema] 2024-01-01T00:00:01Z');
    expect(out).toContain('[schemas/my-app/schema schemas/my_app/tables/users]');
    expect(out).toContain('[schemas/my_app/tables/users auth:schemas/auth/tables/users]');
    // cross-package ref untouched
    expect(out).toContain('auth:schemas/auth/tables/users');
    // metadata untouched
    expect(out).toContain('%project=my-module');
  });

  it('does not rewrite partial-name matches', () => {
    const renames = new Map([['schemas/my-app/schema', 'schemas/my_app/schema']]);
    const out = renameInPlanContent(PLAN, renames);
    expect(out).toContain('schemas/my-app/tables/users [schemas/my_app/schema]');
    expect(out).toContain('schemas/my-app/tables/posts [schemas/my_app/schema schemas/my-app/tables/users]');
  });

  it('returns content unchanged when there are no renames', () => {
    expect(renameInPlanContent(PLAN, new Map())).toBe(PLAN);
  });

  it('preserves a trailing @tag suffix on a dependency ref', () => {
    const plan = 'schemas/a/b [schemas/a/c@v1.0.0] 2024-01-01T00:00:00Z Dev <dev@example.com> # x\n';
    const renames = new Map([['schemas/a/c', 'schemas/a_c']]);
    const out = renameInPlanContent(plan, renames);
    expect(out).toContain('[schemas/a_c@v1.0.0]');
  });

  it('rewrites every dependency in a multi-dep bracket', () => {
    const plan =
      'schemas/x/d [schemas/x/a schemas/x/b schemas/x/c] 2024-01-01T00:00:00Z Dev <dev@example.com> # x\n';
    const renames = new Map([
      ['schemas/x/a', 'schemas/x_a'],
      ['schemas/x/b', 'schemas/x_b'],
      ['schemas/x/c', 'schemas/x_c']
    ]);
    const out = renameInPlanContent(plan, renames);
    expect(out).toContain('[schemas/x_a schemas/x_b schemas/x_c]');
  });

  it('scales linearly: a large plan with a large rename map completes quickly', () => {
    // Reproduces the introspection corpus scale (~8k changes, each depending
    // on the previous). The previous O(lines × renames) implementation with a
    // regex compiled per (line, rename) pair took ~100s here; the linear pass
    // must complete in well under a second.
    const n = 8000;
    const renames = new Map<string, string>();
    const lines: string[] = ['%syntax-version=1.0.0', '%project=big', '%uri=big', ''];
    for (let i = 0; i < n; i++) {
      const name = `schemas/mod-${i}/tables/t-${i}`;
      renames.set(name, name.replace(/-/g, '_'));
      const dep = i > 0 ? ` [schemas/mod-${i - 1}/tables/t-${i - 1}]` : '';
      lines.push(`${name}${dep} 2024-01-01T00:00:00Z Dev <dev@example.com> # change ${i}`);
    }
    const content = lines.join('\n') + '\n';

    const start = Date.now();
    const out = renameInPlanContent(content, renames);
    const elapsedMs = Date.now() - start;

    expect(out).toContain('schemas/mod_0/tables/t_0 ');
    expect(out).toContain(`schemas/mod_${n - 1}/tables/t_${n - 1}`);
    expect(out).toContain('[schemas/mod_0/tables/t_0]');
    // No hyphenated change tokens should remain (metadata/comments still have them).
    expect(out).not.toMatch(/(^|[\s[])schemas\/mod-\d/m);
    expect(elapsedMs).toBeLessThan(2000);
  });
});
