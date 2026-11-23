import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

import { expandWord, ExpansionBudget, type ExpansionScope } from '../src/bash/expand';
import { tokenize } from '../src/bash/tokenize';
import { fencedEnv, runBash } from './differential';

/**
 * The words bash 3.2 (macOS's /bin/bash) and bash 5 make of each brace form,
 * recorded with printf. Linux CI has no bash 3.2, so the kit is checked
 * against the recording; where a bash of either version is at hand, the
 * recording is checked against it first.
 */
const FIXTURE = path.join(__dirname, 'fixtures', 'brace-words.json');
interface Fixture {
  bash3: string;
  bash5: string;
  forms: Record<string, { bash3: string[]; bash5: string[] }>;
}
const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture;
const FORMS = Object.keys(fixture.forms);
const HOME = '/h';

/** The words the kit makes of a form, and whether it says the two bashes differ. */
function kitWords(form: string): { words: string[]; differ: boolean } {
  const word = tokenize(`printf %s ${form}`).commands[0].words[2];
  let differ = false;
  const scope: ExpansionScope = {
    tildeHomes: () => [HOME],
    value: () => null,
    ifsMayDiffer: () => false,
    noteRef: () => undefined,
    dynamic: () => undefined,
    bashesDiffer: () => {
      differ = true;
    },
    tildesDiffer: () => {
      differ = true;
    }
  };
  const words = expandWord(word, 'argument', scope, new ExpansionBudget(() => undefined)).map((a) => (a.kind === 'known' ? a.text : `?${a.knownPrefix}`));
  return { words, differ };
}

function bashWords(bash: string, root: string): Record<string, string[]> {
  // A function prints each word, so no words and one empty word differ.
  const script = `w() { for a in "$@"; do printf '%s\\037' "$a"; done; }\n${FORMS.map((f, k) => `printf '\\n@${k}:'; w ${f}`).join('\n')}`;
  const out = runBash(bash, script, { cwd: root, env: fencedEnv(root, HOME) });
  return Object.fromEntries(FORMS.map((f, k) => [f, (out.split(`\n@${k}:`)[1] ?? '').split('\n@')[0].split('\x1f').slice(0, -1)]));
}

const versionOf = (bash: string, root: string) => (existsSync(bash) ? runBash(bash, 'printf %s "$BASH_VERSION"', { cwd: root, env: fencedEnv(root, HOME) }) : '');

describe('braces under bash 3.2 and bash 5', () => {
  let root: string;
  beforeAll(() => {
    root = realpathSync(mkdtempSync(path.join(tmpdir(), 'kit-bash-versions-')));
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('the recording matches every bash at hand', () => {
    const bashes = ['/bin/bash', '/opt/homebrew/bin/bash', '/usr/local/bin/bash', '/usr/bin/bash'];
    const recorded = { 3: 'bash3', 5: 'bash5' } as const;
    for (const bash of bashes) {
      const major = versionOf(bash, root).split('.')[0];
      const key = recorded[major as '3' | '5'];
      if (!key) continue;
      const live = bashWords(bash, root);
      if (process.env.RECORD_BASH_WORDS === '1') {
        for (const f of FORMS) fixture.forms[f][key] = live[f];
        fixture[key] = versionOf(bash, root);
        writeFileSync(FIXTURE, `${JSON.stringify(fixture, null, 2)}\n`);
      }
      for (const f of FORMS) expect([bash, f, live[f]]).toEqual([bash, f, fixture.forms[f][key]]);
    }
  });

  it.each(FORMS)('%s: the kit checks every word either bash makes, and says when they differ', (form) => {
    const { bash3, bash5 } = fixture.forms[form];
    const { words, differ } = kitWords(form);
    // A word the kit cannot know (`?` and its known start, such as `~user`) covers any word with that start.
    const covers = (w: string) => words.some((k) => k === w || (k.startsWith('?') && w.startsWith(k.slice(1))));
    expect(words.filter((w) => !w.startsWith('?') && !bash3.includes(w) && !bash5.includes(w))).toEqual([]);
    expect([...bash3, ...bash5].filter((w) => !covers(w))).toEqual([]);
    if (JSON.stringify(bash3) !== JSON.stringify(bash5)) expect(differ).toBe(true);
  });
});
