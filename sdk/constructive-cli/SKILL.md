---
name: constructive-cli
description: Build interactive CLI tools with the Constructive CLI SDK. Use when asked to "create a CLI", "build a command-line tool", "add CLI prompts", "create interactive prompts", "store CLI config", "add terminal colors", or when building any CLI application in a Constructive project. This package provides runtime utilities for type coercion, config management, display formatting, and command handler patterns used by generated and custom CLIs.
compatibility: inquirerer, appstash, yanse, Node.js 18+, TypeScript
metadata:
  author: constructive-io
  version: "0.1.0"
---

# Constructive CLI SDK

Runtime utilities for building interactive command-line interfaces using Constructive's CLI toolkit: **inquirerer** for prompts and argument parsing, **appstash** for persistent storage, and **yanse** for terminal colors.

## When to Apply

- Creating a new CLI tool in a Constructive project
- Adding interactive prompts or argument parsing to a command
- Managing persistent CLI configuration (contexts, credentials, settings)
- Formatting CLI output with colors, tables, or key-value displays
- Coercing CLI string arguments to proper GraphQL types
- Building nested subcommand structures (e.g. `cli context create`)
- Working with generated CLI code from `@constructive-io/graphql-codegen`

## Installation

```bash
pnpm add @constructive-sdk/cli
```

## Quick Start

### Creating a CLI with Commands

```typescript
import { CLI } from 'inquirerer';
import { buildCommands, CommandHandler } from '@constructive-sdk/cli';

const hello: CommandHandler = async (argv, prompter, _options) => {
  const answers = await prompter.prompt(argv, [
    { type: 'text', name: 'name', message: 'Your name' }
  ]);
  console.log(`Hello, ${answers.name}!`);
};

const commands = buildCommands([
  { name: 'hello', handler: hello, usage: 'Say hello' }
]);

const app = new CLI(commands);
app.run();
```

### Config Management with appstash

```typescript
import { getConfigStore } from '@constructive-sdk/cli';

const store = getConfigStore('my-tool');

// Create and manage contexts
store.createContext('production', { endpoint: 'https://api.example.com/graphql' });
store.setCurrentContext('production');

// Store credentials
store.setCredentials('production', { token: 'bearer-token-here' });

// Load current context
const ctx = store.getCurrentContext();
```

### Type Coercion for CLI Arguments

```typescript
import { coerceAnswers, stripUndefined, FieldSchema } from '@constructive-sdk/cli';

const schema: FieldSchema = {
  name: 'string',
  age: 'int',
  active: 'boolean',
  metadata: 'json'
};

// CLI args arrive as strings from minimist
const rawArgs = { name: 'Alice', age: '30', active: 'true', metadata: '{"role":"admin"}' };

// Coerce to proper types
const typed = coerceAnswers(rawArgs, schema);
// { name: 'Alice', age: 30, active: true, metadata: { role: 'admin' } }

// Strip undefined values and extra minimist fields
const clean = stripUndefined(typed, schema);
```

### Display Utilities

```typescript
import { printSuccess, printError, printTable, printDetails } from '@constructive-sdk/cli';

printSuccess('Context created');
printError('Connection failed');

printTable(
  ['Name', 'Endpoint', 'Status'],
  [
    ['production', 'https://api.example.com/graphql', 'active'],
    ['staging', 'https://staging.example.com/graphql', 'inactive']
  ]
);

printDetails([
  { key: 'Name', value: 'production' },
  { key: 'Endpoint', value: 'https://api.example.com/graphql' }
]);
```

### Subcommand Dispatching

```typescript
import { createSubcommandHandler, CommandHandler } from '@constructive-sdk/cli';

const createCmd: CommandHandler = async (argv, prompter, options) => {
  // Handle 'context create'
};

const listCmd: CommandHandler = async (argv, prompter, options) => {
  // Handle 'context list'
};

const contextHandler = createSubcommandHandler(
  { create: createCmd, list: listCmd },
  'Usage: my-tool context <create|list>'
);
```

## API Reference

### Config (`@constructive-sdk/cli`)

| Export | Description |
|--------|-------------|
| `getAppDirs(toolName, options?)` | Get XDG-compliant app directories for a CLI tool |
| `getConfigStore(toolName)` | Create a config store with context and credential management |

### Commands (`@constructive-sdk/cli`)

| Export | Description |
|--------|-------------|
| `buildCommands(definitions)` | Build a commands map from command definitions |
| `createSubcommandHandler(subcommands, usage)` | Create a handler that dispatches to subcommands |
| `CommandHandler` | Type: `(argv, prompter, options) => Promise<void>` |
| `CommandDefinition` | Interface: `{ name, handler, usage? }` |

### CLI Utilities (`@constructive-sdk/cli`)

| Export | Description |
|--------|-------------|
| `coerceAnswers(answers, schema)` | Coerce string CLI args to proper GraphQL types |
| `stripUndefined(obj, schema?)` | Remove undefined values and non-schema keys |
| `parseMutationInput(answers)` | Parse JSON input field from CLI mutation commands |
| `buildSelectFromPaths(paths)` | Build ORM select object from dot-notation paths |

### Display (`@constructive-sdk/cli`)

| Export | Description |
|--------|-------------|
| `printSuccess(message)` | Print green success message |
| `printError(message)` | Print red error message to stderr |
| `printWarning(message)` | Print yellow warning to stderr |
| `printInfo(message)` | Print cyan info message |
| `printKeyValue(key, value, indent?)` | Print formatted key-value pair |
| `printDetails(entries, indent?)` | Print aligned key-value block |
| `printTable(headers, rows, indent?)` | Print formatted table |

### Re-exports from inquirerer

| Export | Description |
|--------|-------------|
| `CLI` | Type: The main CLI class |
| `CLIOptions` | Type: CLI configuration options |
| `Inquirerer` | Type: The prompter interface |
| `extractFirst(argv)` | Extract first positional argument |
| `getPackageJson(dir)` | Load package.json from a directory |

## Troubleshooting

### "Cannot find module 'appstash'"
Ensure `appstash` is installed: `pnpm add appstash`

### Type coercion not working
Check that your `FieldSchema` keys match the CLI argument names exactly. Fields not in the schema are ignored by `coerceAnswers`.

### Config store not persisting
The config store writes to `~/.{toolName}/`. Ensure the tool name is consistent across your application. Use `getConfigStore` with the same name everywhere.
