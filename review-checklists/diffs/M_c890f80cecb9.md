# Diff — `M` `packages/cli/__tests__/add.test.ts`

## Navigation
- Prev: [M_48805f780565.md](M_48805f780565.md) | Up: [packages/cli.md](../packages/cli.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_082c64c6daa1.md](M_082c64c6daa1.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `packages/cli`
- Numstat: `+13/-9`
- Reproduce: `git diff main...HEAD -- packages/cli/__tests__/add.test.ts`

## Summary
- Larger change (not cleanly line-aligned)
- Token deltas: `launchql`: 1 → 0

## Key replacements
- ``    fs.writeFileSync(path.join(moduleDir, `${moduleName}.control`), controlContent);``
  - `, 'launchql.` → ``, `${moduleName}.``
  - `'),` → ```),``
- `%uri=https://github.com/test/${moduleName}`
  - `/test-module` → `/${moduleName}`
- ```;``
  - ``}`;`` → ```;``

## Key additions
- `    const relativeFiles = absoluteFiles`
- `      .map((file) => path.relative(argv.cwd, file))`
- `      .sort();`
- `    const moduleName = path.basename(moduleDir);`
- `%project=${moduleName}`
- ``    const controlContent = `# ${moduleName} extension``
- `comment = 'Test module'`
- `default_version = '0.1.0'`
- `relocatable = false`
- `superuser = false`

## Key removals
- `    const relativeFiles = absoluteFiles.map(file => path.relative(argv.cwd, file));`
- `%project=test-module`
- ``    const controlContent = `{``
- `  "name": "test-module",`
- `  "version": "0.1.0",`
- `  "description": "Test module"`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
    const relativeFiles = absoluteFiles.map(file => path.relative(argv.cwd, file));				      |	    const relativeFiles = absoluteFiles
														      >	      .map((file) => path.relative(argv.cwd, file))
														      >	      .sort();
														      >	    const moduleName = path.basename(moduleDir);
%project=test-module												      |	%project=${moduleName}
%uri=https://github.com/test/test-module									      |	%uri=https://github.com/test/${moduleName}
    const controlContent = `{											      |	    const controlContent = `# ${moduleName} extension
  "name": "test-module",											      |	comment = 'Test module'
  "version": "0.1.0",												      |	default_version = '0.1.0'
  "description": "Test module"											      |	relocatable = false
}`;														      |	superuser = false
    fs.writeFileSync(path.join(moduleDir, 'launchql.control'), controlContent);					      |	`;
														      >	    fs.writeFileSync(path.join(moduleDir, `${moduleName}.control`), controlContent);
```

</details>

## Navigation
- Prev: [M_48805f780565.md](M_48805f780565.md) | Up: [packages/cli.md](../packages/cli.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_082c64c6daa1.md](M_082c64c6daa1.md)
