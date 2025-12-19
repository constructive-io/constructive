# Diff — `R055` `packages/env/README.md` → `pgpm/env/README.md`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Type: rename/copy (similarity `55`)
- Numstat: `+3/-3`
- Reproduce: `git diff -M main...HEAD -- packages/env/README.md pgpm/env/README.md`

## Guideline token summary
- Deltas: `@launchql/`: 2 → 0; `launchql`: 2 → 0; `Constructive`: 0 → 1; `LaunchQL`: 1 → 0

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

```text
# @launchql/env													      |	# @pgpmjs/env
Environment management for LaunchQL projects. Provides unified configuration resolution from defaults, config files,  |	Environment management for PGPM (and Constructive) projects. Provides unified configuration resolution from defaults,
import { getEnvOptions } from '@launchql/env';									      |	import { getEnvOptions } from '@pgpmjs/env';
```
