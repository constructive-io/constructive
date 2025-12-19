# Diff — `M` `packages/cli/test-utils/CLIDeployTestFixture.ts`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Numstat: `+2/-2`
- Reproduce: `git diff main...HEAD -- packages/cli/test-utils/CLIDeployTestFixture.ts`

## Guideline token summary
- Deltas: `Constructive`: 0 → 1; `LaunchQL`: 1 → 0; `cnc`: 0 → 1; `constructive`: 0 → 1; `launchql`: 1 → 0; `lql`: 1 → 0

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

```text
      } else if (tokens[0] === 'lql' || tokens[0] === 'launchql') {						      |	      } else if (tokens[0] === 'cnc' || tokens[0] === 'constructive') {
        // Handle LaunchQL CLI commands										      |	        // Handle Constructive CLI commands
```
