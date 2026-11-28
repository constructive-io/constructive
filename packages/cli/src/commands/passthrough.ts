import type { Effect, PassthroughCommand } from '@agentic-kit/command';
import type { CLIOptions, Inquirerer } from 'inquirerer';

type Handler = (argv: Record<string, unknown>, prompter: Inquirerer, options: CLIOptions) => Promise<unknown>;
type Module = { default: Handler; usage: string };

/**
 * A self-host command: its handler keeps its own flags, and its package loads only when it runs. The layer leaves every
 * flag of a passthrough command to it, --help and --schema too, so they are answered here, before anything starts.
 */
function passthrough(name: string, summary: string, effect: Effect, load: () => Module): PassthroughCommand {
  return {
    name,
    summary,
    effect,
    notes: [`Takes its own flags, and has no plan; run "constructive ${name} --help" to list them. It prints its own output, not a JSON envelope.`],
    async passthrough(argv, ctx) {
      if (argv.schema === true) {
        return {
          data: { command: name, passthrough: true, input: null, effect },
          text: `${name} takes its own flags, so it has no input schema: run "constructive ${name} --help" to list them.`
        };
      }
      const { default: handler, usage } = load();
      if (argv.help === true || argv.h === true) return { data: { command: name, usage: usage.trim() }, text: usage.trim() };
      await handler(argv, ctx.prompter, { noTty: !ctx.interactive } as CLIOptions);
      return { data: undefined };
    }
  };
}

// A lazy require, not import(): the CJS build keeps import() as an ESM import, which cannot load these files.
/* eslint-disable @typescript-eslint/no-require-imports */
export const passthroughCommands = [
  passthrough('server', 'Start a local GraphQL server', 'read', () => require('./server') as typeof import('./server')),
  passthrough('explorer', 'Start the local GraphiQL explorer', 'read', () => require('./explorer') as typeof import('./explorer')),
  passthrough('codegen', 'Generate types and an SDK', 'write', () => require('./codegen') as typeof import('./codegen'))
];
/* eslint-enable @typescript-eslint/no-require-imports */
