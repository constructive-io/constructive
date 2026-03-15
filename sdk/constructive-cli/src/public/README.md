# Generated GraphQL SDK

<p align="center" width="100%">
  <img height="120" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

## Overview

- **Tables:** 103
- **Custom queries:** 19
- **Custom mutations:** 31

**Generators:** ORM, CLI

## Modules

### ORM Client (`./orm`)

Prisma-like ORM client for programmatic GraphQL access.

```typescript
import { createClient } from './orm';

const db = createClient({
  endpoint: 'https://api.example.com/graphql',
});
```

See [orm/README.md](./orm/README.md) for full API reference.

### CLI Commands (`./cli`)

inquirerer-based CLI commands for `csdk`.

See [cli/README.md](./cli/README.md) for command reference.

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
