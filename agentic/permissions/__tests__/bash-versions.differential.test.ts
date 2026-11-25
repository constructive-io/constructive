import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

import { analyzeBash } from '../src/bash/analyze';
import { expandWord, ExpansionBudget, type ExpansionScope } from '../src/bash/expand';
import { tokenize } from '../src/bash/tokenize';
import { Findings } from '../src/findings';
import { fencedEnv, runBash } from './differential';

/**
 * The words bash 3.2 (macOS's /bin/bash) and bash 5 make of each brace form,
 * and of a tilde in each script that changes HOME, recorded with printf.
 * Linux CI has no bash 3.2, so the kit is checked against the recording;
 * where a bash of either version is at hand, the recording is checked
 * against it first.
 */
const FIXTURE = path.join(__dirname, 'fixtures', 'brace-words.json');
type Words = Record<string, { bash3: string[]; bash5: string[] }>;
interface Fixture {
  bash3: string;
  bash5: string;
  forms: Words;
  homes: Words;
}
const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture;
const FORMS = Object.keys(fixture.forms);
const HOME_SCRIPTS = Object.keys(fixture.homes);
const HOME = '/h';
/** A function prints each word, so no words and one empty word differ, and it runs no program, which would export HOME again. */
const PRINT_WORDS = `w() { for a in "$@"; do printf '%s\\037' "$a"; done; }`;

/** The words the kit makes of a form: the ones it knows, the known starts of the ones it does not, and whether it says the two bashes differ. */
function kitWords(form: string): { known: string[]; prefixes: string[]; differ: boolean } {
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
  const args = expandWord(word, 'argument', scope, new ExpansionBudget(() => undefined));
  return {
    known: args.flatMap((a) => (a.kind === 'known' ? [a.text] : [])),
    prefixes: args.flatMap((a) => (a.kind === 'unknown' ? [a.knownPrefix] : [])),
    differ
  };
}

function bashWords(bash: string, root: string): Record<string, string[]> {
  const script = `${PRINT_WORDS}\n${FORMS.map((f, k) => `printf '\\n@${k}:'; w ${f}`).join('\n')}`;
  const out = runBash(bash, script, { cwd: root, env: fencedEnv(root, HOME) });
  return Object.fromEntries(FORMS.map((f, k) => [f, (out.split(`\n@${k}:`)[1] ?? '').split('\n@')[0].split('\x1f').slice(0, -1)]));
}

/** Each HOME script in a bash of its own, so the HOME it sets stays there. */
function bashHomeWords(bash: string, root: string): Record<string, string[]> {
  return Object.fromEntries(HOME_SCRIPTS.map((s) => [s, runBash(bash, `${PRINT_WORDS}\n${s}`, { cwd: root, env: fencedEnv(root, HOME) }).split('\x1f').slice(0, -1)]));
}

/** The dirs the kit reads for the tilde of a HOME script, and whether it says the bashes may differ there. */
function kitHomeReads(script: string): { read: string[]; differ: boolean } {
  const findings = new Findings();
  const { paths } = analyzeBash(script.replace(/\bw (\S+)$/, 'cat $1'), { cwd: '/w', homeDir: HOME }, findings);
  return { read: paths.map((p) => p.abs), differ: findings.signals.has('unresolvable-path') };
}

const versionOf = (bash: string, root: string) => (existsSync(bash) ? runBash(bash, 'printf %s "$BASH_VERSION"', { cwd: root, env: fencedEnv(root, HOME) }) : '');

describe('braces and tildes under bash 3.2 and bash 5', () => {
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
      const liveHomes = bashHomeWords(bash, root);
      if (process.env.RECORD_BASH_WORDS === '1') {
        for (const f of FORMS) fixture.forms[f][key] = live[f];
        for (const s of HOME_SCRIPTS) fixture.homes[s][key] = liveHomes[s];
        fixture[key] = versionOf(bash, root);
        writeFileSync(FIXTURE, `${JSON.stringify(fixture, null, 2)}\n`);
      }
      for (const f of FORMS) expect([bash, f, live[f]]).toEqual([bash, f, fixture.forms[f][key]]);
      // A bash 5 build may read a tilde's HOME from the environment it last exported (Homebrew's 5.3 does) or from the shell, so the kit must read what each bash at hand makes.
      for (const s of HOME_SCRIPTS) expect([bash, s, liveHomes[s].filter((w) => !kitHomeReads(s).read.includes(w))]).toEqual([bash, s, []]);
    }
  });

  it.each(FORMS)('%s: the kit checks every word either bash makes, and says when they differ', (form) => {
    const { bash3, bash5 } = fixture.forms[form];
    const { known, prefixes, differ } = kitWords(form);
    // A word the kit cannot know (such as `~user`) covers any word that starts with its known start.
    const covers = (w: string) => known.includes(w) || prefixes.some((p) => w.startsWith(p));
    expect(known.filter((w) => !bash3.includes(w) && !bash5.includes(w))).toEqual([]);
    expect([...bash3, ...bash5].filter((w) => !covers(w))).toEqual([]);
    if (JSON.stringify(bash3) !== JSON.stringify(bash5)) expect(differ).toBe(true);
  });

  // The kit may read a HOME neither bash reads here: it keeps every one the shell held, since it does not know when bash 5.3 last exported one.
  it.each(HOME_SCRIPTS)('%s: the kit reads every dir either bash makes of the tilde, and says when they differ', (script) => {
    const { bash3, bash5 } = fixture.homes[script];
    const { read, differ } = kitHomeReads(script);
    expect([...bash3, ...bash5].filter((w) => !read.includes(w))).toEqual([]);
    if (JSON.stringify(bash3) !== JSON.stringify(bash5)) expect(differ).toBe(true);
  });
});
