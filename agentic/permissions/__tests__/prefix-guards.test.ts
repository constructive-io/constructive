import type { Grant } from '../src';
import { asAsk, makeSandbox, type Sandbox } from './sandbox';

let sb: Sandbox;

beforeAll(async () => {
  sb = await makeSandbox();
});
afterAll(() => sb.cleanup());

const prefix = (...prefixes: string[]): Grant => ({ scope: 'project', match: { type: 'command-prefix', prefixes }, createdAt: '' });
const exact = (command: string): Grant => ({ scope: 'project', match: { type: 'command', command }, createdAt: '' });
const projectMatch = async (command: string) => asAsk(await sb.bash(command, 'ask')).grantOptions[1].match;

// Each command writes a file or runs another program through an option, and a held prefix
// matches its leading words. In Ask mode it must still ask.
// prettier-ignore
const bypasses: [command: string, prefixes: string[]][] = [
  ["git grep -O'touch x;' foo", ['git grep']],
  ["git fetch --upload-pack='touch x;' .", ['git fetch']],
  ["git rebase -x 'touch x' HEAD~1", ['git rebase']],
  ["make test -f - <<'EOF'\ntest:\n\ttouch m11\nEOF", ['make test']],
  ['git log -1 --format=x --output=.husky/pre-commit', ['git log']],
  ['sort -o src/a.ts README.md', ['sort']],
  ['uniq README.md src/a.ts', ['uniq']],
  ['tree -o src/a.ts', ['tree']],
  ['touch src/a.ts', ['touch']],
  ['mkdir build', ['mkdir']],
  // other spellings of a denied option: quoted, abbreviated, from braces, clustered, from a variable
  ["git fetch '--upload-pack=touch x' .", ['git fetch']],
  ["git fetch --upl='touch x' .", ['git fetch']],
  ['git fetch {--upload-pack=x,.}', ['git fetch']],
  ["git rebase -ix 'touch x' HEAD~1", ['git rebase']],
  ['git fetch $OPT .', ['git fetch']],
  ['git log --outp=notes.txt', ['git log']],
  ["git push --receive-pack='touch x' origin", ['git push']],
  ['git diff --ext-diff', ['git diff']],
  ['git log --textconv', ['git log']],
  ['npm test --script-shell=./evil.sh', ['npm test']],
  ['npm run build --prefix sub', ['npm run build']],
  ['bun test --preload ./x.ts', ['bun test']],
  // a part with a heredoc or a `\r`
  ['cat <<EOF\nhi\nEOF', ['cat']],
  ['echo a\rb', ['echo']]
];

describe('a prefix never covers a part that writes a file or runs another program', () => {
  it.each(bypasses)('%j', async (command, prefixes) => {
    expect((await sb.bash(command, 'ask', [prefix(...prefixes)])).decision).toBe('ask');
  });

  it('still covers the plain runs of the same commands', async () => {
    expect((await sb.bash('git fetch origin', 'ask', [prefix('git fetch')])).decision).toBe('allow');
    expect((await sb.bash('git log -1 --format=%H', 'ask', [prefix('git log')])).decision).toBe('allow');
    expect((await sb.bash('git switch -c feature', 'ask', [prefix('git switch')])).decision).toBe('allow');
    expect((await sb.bash('npm run build -- --prefix x', 'ask', [prefix('npm run build')])).decision).toBe('allow');
  });

  it('lets an exact grant of the whole command still cover it', async () => {
    expect((await sb.bash('touch src/a.ts', 'ask', [exact('touch src/a.ts')])).decision).toBe('allow');
  });

  it('sees the writes the options make, so Workspace mode asks before a hook changes', async () => {
    for (const command of ['git log -1 --format=x --output=.husky/pre-commit', 'git log --outp=.husky/pre-commit', 'sort -o .git/hooks/pre-commit README.md', 'tree -o .husky/x', 'uniq README.md .husky/pre-commit']) {
      const d = await sb.bash(command, 'workspace');
      expect([command, d.decision, d.request.signals]).toEqual([command, 'ask', ['ask-write']]);
    }
  });

  it('offers only the exact command for a part that writes or uses a denied option', async () => {
    for (const command of ['touch src/a.ts', 'git log --output=notes.txt', "git fetch --upload-pack='touch x' .", 'echo a\rb']) {
      expect((await projectMatch(command)).type).toBe('command');
    }
  });
});
