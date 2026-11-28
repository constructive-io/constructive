// A second process for agent.test.ts: resolves one agent session from the
// store in argv[2] and prints what it got. Run with ts-node.
import { openStore } from '../src/account-store';
import { agentSession } from '../src/agent';

(async () => {
  const store = openStore(process.argv[2]);
  const session = await agentSession({ store, name: process.argv[3], env: {} });
  process.stdout.write(JSON.stringify(session.kind === 'signed-in' ? { kind: session.kind, token: session.account.accessToken } : session));
})().catch((err) => {
  process.stdout.write(JSON.stringify({ kind: 'threw', message: String(err?.message ?? err) }));
});
