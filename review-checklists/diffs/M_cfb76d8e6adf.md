# Diff — `M` `packages/cli/__tests__/package.test.ts`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Numstat: `+3/-3`
- Reproduce: `git diff main...HEAD -- packages/cli/__tests__/package.test.ts`

## Guideline token summary
- Deltas: `constructive`: 0 → 3; `launchql`: 3 → 0

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

```text
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'launchql-test-'));						      |	    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'constructive-io-graphql-test-'));
    const fixtureWorkspace = fixture('launchql');								      |	    const fixtureWorkspace = fixture('constructive');
    const workspacePath = path.join(tempDir, 'launchql');							      |	    const workspacePath = path.join(tempDir, 'constructive');
```
