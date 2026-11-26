# @agentic-kit/command

The typed command layer of the Constructive CLI, and the binding of a `HarnessTool` from `@agentic-kit/harness` to a command. A command's input is a zod object; help, `--schema` and `--llms` print JSON Schema made from it, and the layer parses the input with it once. `inquirerer` stays the prompt library: the layer asks for missing input, and for the approval of a change, through its prompts.

```ts
import { createCli, toCliCommands, toolCommand } from '@agentic-kit/command';
import { constructiveGateDeps, deleteTableTool, describeSchemaTool } from '@agentic-kit/db-tools';
import { createConstructiveGatePolicy } from '@agentic-kit/harness';
import { z } from 'zod';

const commands = toCliCommands([
  toolCommand(describeSchemaTool, { name: 'schema show' }),
  toolCommand(deleteTableTool, { name: 'table delete', positionals: ['table_name'] })
], { gate: createConstructiveGatePolicy(constructiveGateDeps()) });

createCli({
  name: 'constructive',
  version,
  globals: z.object({ context: z.string().optional().meta({ description: 'The backend context to use', 'x-carry': true }) }),
  commands
}).run();
```

## Five kinds of command

- **A read** (`effect: 'read'`, `run(input, ctx)`): the layer runs it at once. `--dry-run` and `--yes` mean nothing to it.
- **A change** (`effect: 'write' | 'destructive'`, `plan(input, ctx)` and `apply(input, planned, ctx)`): the layer calls `plan`, then decides from the run alone. `--dry-run` returns `{ applied: false, plan }` with the real run (`--yes`) as the next step. `--yes` or `-y` approves. A terminal shows the plan and asks; a no is `cancelled`, exit 1. Anything else (no terminal, `--no-input`, `CI`) stops with `approval-required`, exit 3, the plan in `error.details.plan` and the same command line with `--yes` as the next step. `apply` runs only after one of those approvals. `plan` returns `{ plan: ConfirmPrompt, needs?: string[], ...state }`: the layer prints only `plan`, and hands the whole value to `apply`, so a change applies exactly what was approved. `needs` are the flags that the run that applies the plan must add when it has no terminal (`--password-stdin` for a password that a terminal would ask for): on a run with no terminal, the layer adds them to the `--yes` step after `--dry-run` and after exit 3. A `plan` that throws stops the run with its error, under `--dry-run` too.
- **A change that runs at once** (`effect: 'write'`, `immediate: true`, `run(input, ctx)`): a change the person makes to their own local session (sign in, sign out, choose a context), or one that only narrows access. It runs as it is, with no `--yes` and no prompt, and refuses `--dry-run` (`dry-run-unsupported`). A CLI keeps the list of these short and fixed.
- **A server** (`stdout: 'reserved'`, `serve(input, ctx)`): it speaks a protocol on stdin and stdout, and its client approves each change made through it, so the layer refuses `--dry-run` (`dry-run-unsupported`) and `--yes` (`invalid-input`). Its results, errors and warnings go to stderr. `effect` is the strongest effect its client can reach.
- **A passthrough** (`passthrough(argv, ctx)`): it keeps its own flags, so it gets every word after the command path, parsed by `parseArgv`, and the layer reads none of them.

`createCli` checks the kind of every command at start-up: a change with a `run` and no `immediate: true`, or without `plan` and `apply`, is a definition error, and only a write can run at once, so no change skips the approval by accident.

## The input

- Each property of the zod object is a flag, in kebab-case, snake_case or camelCase. `--no-<flag>` sets a boolean to false. An unknown flag is `unknown-flag`, exit 2, with the nearest flags.
- Values are coerced by the JSON Schema type of the property: string, number, integer, boolean and enum. A list of scalars takes a repeated flag or a JSON array. Anything else takes JSON text or `@path`. `--input <json|@path|->` gives the whole input, and flags override its keys.
- `positionals` name the properties that the arguments fill, in order. When the last one is a list, it takes every argument left.
- Missing required input is asked for on a terminal (an enum as a list, a boolean as a confirm, `x-secret` as a password), and is `missing-input`, exit 2, anywhere else. The layer never reads stdin for a run that cannot prompt.
- The one null rule: `null` for an optional key reads as "not given" where the key's schema does not take null, at any depth. Then zod parses the input once. A failure is `invalid-input`, exit 2: it names the flag (or `--input`, or the argument) and the path in it, the nearest allowed key or enum value, and lists every issue in `error.details.issues`. It never quotes a value.
- `.meta({ 'x-secret': true })` marks a secret: it is never echoed in an error, a next step, `ctx.invocation` or the manifest. `.meta({ 'x-carry': true })` on a global flag makes every next step repeat it.

## Output and exit codes

- On a terminal, text with a `Next:` block; otherwise, or with `--json`, one envelope: `{ "ok": true, "data", "meta": { "command", "next", "warnings" } }` or `{ "ok": false, "error": { "code", "message", "cause", "hint", "retryable", "details" }, "meta": { "command", "next" } }`. `--fields a,b.c` keeps only those paths of `data`.
- Exit codes (`ExitCode`): 0 done, 1 failed, 2 usage, 3 approval required, 4 sign in first, 130 interrupted. A `CliError` keeps its own exit code, also across two copies of the package (`isCliError`).
- `--help` and `-h`, `<command> --schema` (`{ name, summary, effect, positionals, input, output }`), `--llms` and `--llms --json` come from the registry.
- A next step is `{ command, argv, placeholders?, why }`: `ctx.next(words, why)`, `ctx.nextFor(command, input, why)` and `ctx.followUp(flags, { why, drop, command })` build them.

## Help topics and the reference

- `topics` in `createCli` are the pages of help that belong to no one command: `{ name, summary, body, section? }`, with a Markdown `body` of paragraphs, lists and code, and no headings. The root help and `--llms` list them, and the manifest carries them whole. A topic name that is also a command or a group name is a definition error.
- Every CLI gets the read command `help`: `help` prints the root help, `help <command words>` the help of a command or a group (the same page `--help` prints), and `help <topic>` a topic. Any other words are `unknown-topic`, exit 2, with the nearest command, group or topic. A CLI cannot define a command named `help`.
- `renderReference(manifest)` turns a manifest into one Markdown reference in the shape of a manual page: the name and synopsis, the description and the notes, the global flags, every command with its usage, flags, examples and notes, every topic as a section of its own, then `EXIT STATUS`, `ENVIRONMENT` and `FILES`, each from the topic whose `section` names it, and `SEE ALSO`. A Markdown-to-roff converter makes a man page of it.

## Tool commands

`toolCommand(tool, options)` types one entry by its tool, and `toCliCommands(entries, { gate, failureNext, onUnrenderedCall })` builds every command of a CLI.

- The tool's zod params are the command input. A friendlier input needs `mapInput`, and what it returns is parsed by the tool's params.
- The command's effect is the tool's one static `effect`. A read tool command runs the tool. A change tool command plans with the gate policy (`callChange`): a `blocked` decision stops with the gate's failure, and an `ask` decision is the plan. `apply` calls the tool with the params of that plan.
- A tool `failure` becomes a `CliError` with the same code, message, hint and `retryable`, and the tool's details plus the failure's `errorId` and `context` (`failureError`). `signed-out`, `step-up-required` and `app-signed-out` exit 4, `invalid-input` exits 2, any other code exits 1.
- A tool's text, summary, description and failure words go to the reader as the tool wrote them: they name no tool and no parameter, and the steps that follow travel as `calls` data.
- The calls a tool suggests become the first next steps, through the first command bound to the tool that can make them (`toInput`, or the same names). `toolCallStep(entries)` writes any call the same way, for a host such as an MCP server.

## Exports

- The layer: `createCli`, `renderReference`, `CliError`, `isCliError`, `ExitCode`, `COMMAND_ERROR_CODES`, `flagName`, `decideApproval`, and the types `Cli`, `CliConfig`, `CliIO`, `CliManifest`, `CommandManifest`, `HelpTopic`, `ReferenceSection`, `CommandDefinition`, `ReadCommand`, `ChangeCommand`, `ImmediateCommand`, `ServeCommand`, `PassthroughCommand`, `Planned`, `PlanData`, `Approval`, `CommandContext`, `CommandResult`, `CommandExample`, `CommandErrorCode`, `CliErrorInit`, `Effect`, `InputSchema`, `JSONSchema`, `JSONSchemaType`, `NextStep`, `NextWord`, `StepOptions`, `FollowUpOptions`.
- The tool binding: `toolCommand`, `toCliCommands`, `toCliCommand`, `toolCallStep`, `failureError`, and the types `ToolCommandEntry`, `ToolCommandOptions`, `ToolCommandDeps`, `ToolBinding`, `ToolCallStep`, `FailureNext`.
