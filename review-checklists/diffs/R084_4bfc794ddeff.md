# Diff — `R084` `packages/core/__tests__/core/launchql-project.test.ts` → `pgpm/core/__tests__/core/constructive-project.test.ts`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Type: rename/copy (similarity `84`)
- Numstat: `+13/-13`
- Reproduce: `git diff -M main...HEAD -- packages/core/__tests__/core/launchql-project.test.ts pgpm/core/__tests__/core/constructive-project.test.ts`

## Guideline token summary
- Deltas: `constructive`: 0 → 13; `launchql`: 13 → 0

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

```text
    const cwd = fixture.getFixturePath('launchql');								      |	    const cwd = fixture.getFixturePath('constructive');
    const cwd = fixture.getFixturePath('launchql', 'packages', 'secrets');					      |	    const cwd = fixture.getFixturePath('constructive', 'packages', 'secrets');
    const cwd = fixture.getFixturePath('launchql');								      |	    const cwd = fixture.getFixturePath('constructive');
    const cwd = fixture.getFixturePath('launchql', 'packages', 'secrets');					      |	    const cwd = fixture.getFixturePath('constructive', 'packages', 'secrets');
    const cwd = fixture.getFixturePath('launchql', 'packages', 'secrets');					      |	    const cwd = fixture.getFixturePath('constructive', 'packages', 'secrets');
    const cwd = fixture.getFixturePath('launchql', 'packages', 'secrets');					      |	    const cwd = fixture.getFixturePath('constructive', 'packages', 'secrets');
    const cwd = fixture.getFixturePath('launchql');								      |	    const cwd = fixture.getFixturePath('constructive');
    const cwd = fixture.getFixturePath('launchql');								      |	    const cwd = fixture.getFixturePath('constructive');
    const cwd = fixture.getFixturePath('launchql', 'packages', 'secrets');					      |	    const cwd = fixture.getFixturePath('constructive', 'packages', 'secrets');
    const cwd = fixture.getFixturePath('launchql');								      |	    const cwd = fixture.getFixturePath('constructive');
    const cwd = fixture.getFixturePath('launchql');								      |	    const cwd = fixture.getFixturePath('constructive');
    const cwd = fixture.getFixturePath('launchql');								      |	    const cwd = fixture.getFixturePath('constructive');
    const cwd = fixture.getFixturePath('launchql');								      |	    const cwd = fixture.getFixturePath('constructive');
```
