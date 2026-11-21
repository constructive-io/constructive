import {
  type CommandMatch,
  commandPattern,
  type CommandPrefixMatch,
  type GrantMatch,
  parseCommandPattern,
  sameMatch
} from '../src';
import { asAsk, makeSandbox, type Sandbox } from './sandbox';

let sb: Sandbox;

beforeAll(async () => {
  sb = await makeSandbox();
});
afterAll(() => sb.cleanup());

const prefixes = (...list: string[]): CommandPrefixMatch => ({ type: 'command-prefix', prefixes: list });
const exact = (command: string): CommandMatch => ({ type: 'command', command });

describe('parseCommandPattern', () => {
  // prettier-ignore
  const valid: [text: string, match: GrantMatch][] = [
    ['git status *, npm run test *', prefixes('git status', 'npm run test')],
    ['  git   status * ,npm run test *  ', prefixes('git status', 'npm run test')],
    ['git status *, git status *', prefixes('git status')],
    ['node scripts/build.js *', prefixes('node scripts/build.js')],
    ['pnpm   test', exact('pnpm test')],
    ['echo a, b', exact('echo a, b')],
    ['curl -d @data.json https://api.example.com', exact('curl -d @data.json https://api.example.com')]
  ];
  it.each(valid)('reads %j', (text, match) => {
    expect(parseCommandPattern(text)).toEqual({ ok: true, match });
  });

  // prettier-ignore
  const refused: [text: string, reason: string][] = [
    ['   ', 'Type a command, such as `pnpm test`, or a prefix, such as `git status *`.'],
    ['git status *, npm test', 'Use either prefixes or one exact command. End every part with ` *`, or remove each ` *` to save the exact command.'],
    ['git status *,', 'Remove the extra comma.'],
    ['*', 'Add the command before `*`, as in `git status *`.'],
    ['git * status *', 'A `*` can only end a prefix, as in `git status *`. Remove the other `*` in `git * status *`.'],
    ['git -C src status *', 'A prefix can\'t hold an option such as `-C`. End the prefix before it, or save the exact command instead.'],
    ['git "status" *', 'A prefix can only hold plain words, and `"status"` isn\'t one. Remove it, or save the exact command instead.'],
    ['npm run $SCRIPT *', 'A prefix can only hold plain words, and `$SCRIPT` isn\'t one. Remove it, or save the exact command instead.'],
    ['git log "x *', '`git log "x *` holds shell code a rule can\'t match. Use plain words, or save the exact command instead.'],
    ['echo $(whoami) *', '`echo $(whoami) *` holds shell code a rule can\'t match. Use plain words, or save the exact command instead.'],
    ['echo x > out.txt *', 'A prefix can\'t hold a redirection. Remove it from `echo x > out.txt *`.'],
    ['git status && npm test *', '`git status && npm test *` holds more than one command. Write each one as its own prefix, separated by commas.'],
    ['if true *', 'A prefix can\'t start with the shell keyword `if`. Start it with the program name.'],
    ['echo «secret:ACCESS_TOKEN#1a2b»', 'A command with a `«secret:…»` placeholder asks every time, so this rule would never apply. Remove the placeholder.'],
    ['ls *, cat *, git status *, git log *, npm test *, pnpm test *', 'A rule can hold at most 5 prefixes, and this one has 6. Split it into two rules.'],
    ['printf *', '`printf *` isn\'t on the prefix list, so a rule can\'t cover its later runs. Use a listed prefix, such as `git status *` or `npm run test *`, or save the exact command instead.'],
    ['git *', '`git *` isn\'t on the prefix list, so a rule can\'t cover its later runs. Use a listed prefix, such as `git status *` or `npm run test *`, or save the exact command instead.'],
    ['./scripts/deploy.sh *', '`./scripts/deploy.sh *` isn\'t on the prefix list, so a rule can\'t cover its later runs. Use a listed prefix, such as `git status *` or `npm run test *`, or save the exact command instead.'],
    ['npm run *', '`npm run *` is too broad. Add the script name after `npm run`.'],
    ['node *', '`node *` is too broad. Add the script name after `node`.'],
    ['python -m pytest *', 'A prefix can\'t hold an option such as `-m`. End the prefix before it, or save the exact command instead.']
  ];
  it.each(refused)('refuses %j', (text, reason) => {
    expect(parseCommandPattern(text)).toEqual({ ok: false, reason });
  });

  it('accepts as many prefixes as a card may offer', () => {
    expect(parseCommandPattern('ls *, cat *, git status *, git log *, npm test *')).toMatchObject({ ok: true });
  });
});

describe('commandPattern', () => {
  it('writes the text a card and Settings show', () => {
    expect(commandPattern(prefixes('git status', 'npm run test'))).toBe('git status *, npm run test *');
    expect(commandPattern(exact('pnpm test'))).toBe('pnpm test');
  });

  it('reads back every match the editor accepts and every match a card offers', async () => {
    const cards = [
      'git status && npm run test',
      'python3 -m pytest tests',
      'docker compose up -d',
      'npm test 2>&1 | tail -20',
      './scripts/deploy.sh staging',
      'node -e "process.exit(0)"',
      'echo a, b > out.txt'
    ];
    const offered = await Promise.all(cards.map(async (c) => asAsk(await sb.bash(c, 'ask')).grantOptions[1].match));
    const typed = [prefixes('git status', 'npm run test'), prefixes('node scripts/build.js'), exact('echo a, b'), exact('pnpm test')];
    for (const match of [...offered, ...typed] as (CommandMatch | CommandPrefixMatch)[]) {
      const read = parseCommandPattern(commandPattern(match));
      expect(read.ok && sameMatch(read.match, match)).toBe(true);
    }
  });
});
