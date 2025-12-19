# Diff — `M` `graphile/graphile-settings/package.json`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Numstat: `+4/-4`
- Reproduce: `git diff main...HEAD -- graphile/graphile-settings/package.json`

## Guideline token summary
- Deltas: `constructive`: 7 → 10; `launchql`: 3 → 0; `@constructive-io/`: 0 → 2; `@launchql/`: 2 → 0

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

```text
    "test": "jest",												      |	    "test": "jest --passWithNoTests",
    "@launchql/env": "workspace:^",										      |	    "@constructive-io/graphql-env": "workspace:^",
    "@launchql/types": "workspace:^",										      |	    "@constructive-io/graphql-types": "workspace:^",
    "launchql",													      |	    "constructive",
```
