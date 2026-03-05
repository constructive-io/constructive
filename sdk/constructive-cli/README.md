# @constructive-io/cli

Runtime utilities for building interactive command-line interfaces using Constructive's CLI toolkit.

- **inquirerer** - Interactive prompts and argument parsing
- **appstash** - Persistent configuration, context, and credential storage
- **yanse** - Terminal colors and formatting

## Installation

```bash
pnpm add @constructive-io/cli
```

## Usage

```typescript
import { CLI } from 'inquirerer';
import {
  buildCommands,
  getConfigStore,
  coerceAnswers,
  printSuccess,
} from '@constructive-io/cli';
```

See [SKILL.md](./SKILL.md) for full API reference and examples.

## License

MIT
