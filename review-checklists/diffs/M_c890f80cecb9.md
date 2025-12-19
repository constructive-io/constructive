# Diff — `M` `packages/cli/__tests__/add.test.ts`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Numstat: `+13/-9`
- Reproduce: `git diff main...HEAD -- packages/cli/__tests__/add.test.ts`

## Guideline token summary
- Deltas: `launchql`: 1 → 0

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

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
