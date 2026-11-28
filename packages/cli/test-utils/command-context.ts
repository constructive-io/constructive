import type { CommandContext, ReadCommand } from '@agentic-kit/command';
import { PassThrough } from 'stream';

import { createConstructiveCli } from '../src/cli';
import { toolCommands } from '../src/commands/tools';
import { openSession, type Session } from '../src/session';

/** The context and the session a real run of the CLI with `argv` (its global flags) gives a command, for code that takes them, as `mcp` does. */
export async function commandContext(argv: string[], { env, cwd }: { env: NodeJS.ProcessEnv; cwd: string }): Promise<{ ctx: CommandContext; session: Session }> {
  let captured: { ctx: CommandContext; session: Session } | undefined;
  const probe: ReadCommand = {
    name: 'probe',
    summary: 'Keep the context of this run',
    effect: 'read',
    async run(_input, ctx) {
      captured = { ctx, session: await openSession(ctx) };
      return { data: null };
    }
  };
  let err = '';
  const stderr = new PassThrough();
  stderr.on('data', (chunk) => (err += chunk));
  const code = await createConstructiveCli([...toolCommands, probe]).run([...argv, 'probe'], { stdin: new PassThrough(), stdout: new PassThrough(), stderr, env, cwd });
  if (!captured) throw new Error(`The probe command did not run (exit ${code}): ${err}`);
  return captured;
}
