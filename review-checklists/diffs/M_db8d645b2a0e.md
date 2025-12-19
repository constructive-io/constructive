# Diff — `M` `Dockerfile`

## Navigation
- Prev: [M_7eef2f305cc7.md](M_7eef2f305cc7.md) | Up: [ROOT.md](../ROOT.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_2ba8adcad7c8.md](M_2ba8adcad7c8.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `ROOT`
- Numstat: `+5/-5`
- Reproduce: `git diff main...HEAD -- Dockerfile`

## Changes (line-aligned)
- `    printf '#!/usr/bin/env bash\nnode /app/packages/cli/dist/index.js "$@"\n' > /usr/local/bin/cnc; \`
  - `lql` → `cnc`
- `    printf '#!/usr/bin/env bash\nnode /app/packages/cli/dist/index.js "$@"\n' > /usr/local/bin/constructive; \`
  - `launchql` → `constructive`
- `    printf '#!/usr/bin/env bash\nnode /app/pgpm/pgpm/dist/index.js "$@"\n' > /usr/local/bin/pgpm; \`
  - `packages` → `pgpm`
- `    chmod +x /usr/local/bin/cnc /usr/local/bin/constructive /usr/local/bin/pgpm`
  - `lql` → `cnc`
  - `launchql` → `constructive`
- `ENTRYPOINT ["/usr/local/bin/constructive"]`
  - `lql` → `constructive`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
    printf '#!/usr/bin/env bash\nnode /app/packages/cli/dist/index.js "$@"\n' > /usr/local/bin/lql; \		      |	    printf '#!/usr/bin/env bash\nnode /app/packages/cli/dist/index.js "$@"\n' > /usr/local/bin/cnc; \
    printf '#!/usr/bin/env bash\nnode /app/packages/cli/dist/index.js "$@"\n' > /usr/local/bin/launchql; \	      |	    printf '#!/usr/bin/env bash\nnode /app/packages/cli/dist/index.js "$@"\n' > /usr/local/bin/constructive; \
    printf '#!/usr/bin/env bash\nnode /app/packages/pgpm/dist/index.js "$@"\n' > /usr/local/bin/pgpm; \		      |	    printf '#!/usr/bin/env bash\nnode /app/pgpm/pgpm/dist/index.js "$@"\n' > /usr/local/bin/pgpm; \
    chmod +x /usr/local/bin/lql /usr/local/bin/launchql /usr/local/bin/pgpm					      |	    chmod +x /usr/local/bin/cnc /usr/local/bin/constructive /usr/local/bin/pgpm
ENTRYPOINT ["/usr/local/bin/lql"]										      |	ENTRYPOINT ["/usr/local/bin/constructive"]
```

</details>

## Navigation
- Prev: [M_7eef2f305cc7.md](M_7eef2f305cc7.md) | Up: [ROOT.md](../ROOT.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_2ba8adcad7c8.md](M_2ba8adcad7c8.md)
