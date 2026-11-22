import { asAsk, exactGrant, makeSandbox, prefixGrant, type Sandbox } from './sandbox';

let sb: Sandbox;

beforeAll(async () => {
  sb = await makeSandbox();
});
afterAll(() => sb.cleanup());

const prefix = prefixGrant;
const exact = exactGrant;
const projectMatch = async (command: string) => asAsk(await sb.bash(command, 'ask')).grantOptions[1].match;

// Each command writes a file or runs another program through an option, and a held prefix
// matches its leading words. In Ask mode it must still ask.
// prettier-ignore
const bypasses: [command: string, prefixes: string[]][] = [
  ['rg --pre sh . s.sh', ['rg']],
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
  // options after `--`: git still reads them when `--` is the value of the option before it
  ["git fetch -o -- --upload-pack='touch x;' .", ['git fetch']],
  ["git grep -e -- -O'touch x;'", ['git grep']],
  ["git rebase -X -- -x 'touch x' HEAD~1", ['git rebase']],
  ['git fetch "--" --upload-pack=\'touch x;\' .', ['git fetch']],
  // an unquoted variable inside a word splits it into words the guard cannot see
  ["git fetch . HEAD$IFS--upload-pack='touch x;'", ['git fetch']],
  ["git grep -e foo$IFS-O'touch x;'", ['git grep']],
  ["echo ' --output=.husky/pre-commit --format=touch%x20x -1'; git log HEAD$_", ['echo', 'git log']],
  ["echo '/.. --upload-pack=touch${IFS}x;#'; git fetch src$_", ['echo', 'git fetch']],
  [`git fetch {.,${'x,'.repeat(300)}--upload-pack='touch x;'}`, ['git fetch']],
  ['cat id_{a..z}{a..z}{a..z}', ['cat']],
  // a `+x` is an option, and a `cd` points every later relative path somewhere else
  ['bash +x other.sh', ['bash +x']],
  // a runner's subcommand comes before the script, so the script must still be in the prefix
  ['tsx watch other.ts', ['tsx watch']],
  ['node inspect other.js', ['node inspect']],
  ['cd sub && npm test', ['cd', 'npm test']],
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
    expect((await sb.bash('npm run build -- --watch', 'ask', [prefix('npm run build')])).decision).toBe('allow');
  });

  it('does not cover the parts after a cd with grants made for another dir', async () => {
    expect((await sb.bash('cd sub && npm test', 'ask', [exact('cd sub'), prefix('npm test')])).decision).toBe('ask');
    expect((await sb.bash('builtin cd sub; node scripts/x.js', 'ask', [exact('builtin cd sub'), prefix('node scripts/x.js')])).decision).toBe('ask');
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

// Each card offered a prefix that covers any code or remote action its arguments name.
// prettier-ignore
const broad: string[] = [
  "gh api graphql -f query='{viewer{login}}'",
  'npm init -y',
  'npm x cowsay hi',
  'npm exec cowsay',
  'npm run-script build',
  'npm install left-pad',
  'npx jest',
  'pnpm create vite',
  'pnpm dlx create-foo',
  'pnpm exec jest',
  'pnpm add left-pad',
  'yarn dlx create-foo',
  'yarn create foo',
  'bun x cowsay',
  'bun create foo',
  'bunx cowsay',
  'deno run main.ts',
  'go run .',
  'cargo run',
  'docker run --rm hello-world',
  'python -m pytest -q',
  'make test',
  'printf %s x',
  'rg foo',
  'sort README.md',
  'git bisect run make',
  'git submodule foreach ls',
  'git config user.name x',
  'git remote add x https://x.example',
  'bash +x deploy.sh',
  'cd src && git diff'
];

describe('the arity table offers a prefix only for an action that runs no code from its arguments', () => {
  it.each(broad)('%j gets the exact command', async (command) => {
    expect(await projectMatch(command)).toEqual({ type: 'command', command });
  });

  it('ignores a held prefix for a program the table does not list', async () => {
    const mutation = "gh api graphql -f query='mutation{deleteRepository(input:{repositoryId:\"x\"}){clientMutationId}}'";
    expect((await sb.bash(mutation, 'ask', [prefix('gh api graphql')])).decision).toBe('ask');
    expect((await sb.bash('git bisect run rm -rf src', 'ask', [prefix('git')])).decision).toBe('ask');
    expect((await sb.bash('npm test', 'ask', [prefix('npm')])).decision).toBe('ask');
  });
});
