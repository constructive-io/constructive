# Diff — `M` `Dockerfile`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Numstat: `+5/-5`
- Reproduce: `git diff main...HEAD -- Dockerfile`

## Guideline token summary
- Deltas: `constructive`: 5 → 8; `lql`: 3 → 0; `cnc`: 0 → 2; `launchql`: 2 → 0

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

```text
    printf '#!/usr/bin/env bash\nnode /app/packages/cli/dist/index.js "$@"\n' > /usr/local/bin/lql; \		      |	    printf '#!/usr/bin/env bash\nnode /app/packages/cli/dist/index.js "$@"\n' > /usr/local/bin/cnc; \
    printf '#!/usr/bin/env bash\nnode /app/packages/cli/dist/index.js "$@"\n' > /usr/local/bin/launchql; \	      |	    printf '#!/usr/bin/env bash\nnode /app/packages/cli/dist/index.js "$@"\n' > /usr/local/bin/constructive; \
    printf '#!/usr/bin/env bash\nnode /app/packages/pgpm/dist/index.js "$@"\n' > /usr/local/bin/pgpm; \		      |	    printf '#!/usr/bin/env bash\nnode /app/pgpm/pgpm/dist/index.js "$@"\n' > /usr/local/bin/pgpm; \
    chmod +x /usr/local/bin/lql /usr/local/bin/launchql /usr/local/bin/pgpm					      |	    chmod +x /usr/local/bin/cnc /usr/local/bin/constructive /usr/local/bin/pgpm
ENTRYPOINT ["/usr/local/bin/lql"]										      |	ENTRYPOINT ["/usr/local/bin/constructive"]
```
