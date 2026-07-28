/**
 * safegres eval loop (jest-driven).
 *
 *   pnpm eval          run all cases against goldens (fails on drift)
 *   pnpm eval:update   re-record goldens from current tool behavior
 *
 * Each case's SQL fixture is deployed into an isolated database (pgsql-test)
 * and audited under every preset. The recorded signal per (case, preset) is
 * `{ score, grade, byCode }` — a finding-count histogram keyed by rule code,
 * stable enough to catch scoring changes and rule regressions without
 * depending on finding order or message wording. A scoreboard is printed on
 * every run.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getConnections, type PgTestClient } from 'pgsql-test';

import { audit } from '../src/commands/audit';
import { loadConfig } from '../src/config/loader';
import { CASES, type PresetName,PRESETS } from './cases';

jest.setTimeout(180000);

const GOLDEN_DIR = path.join(__dirname, 'golden');
const FIXTURE_DIR = path.join(__dirname, 'fixtures');
const UPDATE = process.env.UPDATE_GOLDENS === '1';

interface PresetResult {
  score: number;
  grade: string;
  byCode: Record<string, number>;
}
type CaseGolden = Record<PresetName, PresetResult>;

function histogram(codes: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of [...codes].sort()) out[c] = (out[c] ?? 0) + 1;
  return out;
}

function goldenPath(name: string): string {
  return path.join(GOLDEN_DIR, `${name}.json`);
}

let pg: PgTestClient;
let teardown: () => Promise<void>;
const results: Record<string, CaseGolden> = {};

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
  for (const c of CASES) {
    await pg.any(fs.readFileSync(path.join(FIXTURE_DIR, c.file), 'utf8'));
    const g = {} as CaseGolden;
    for (const preset of PRESETS) {
      const { config } = loadConfig({ preset });
      const report = await audit(pg.client as never, { schemas: [c.schema], config });
      g[preset] = {
        score: report.score?.value ?? -1,
        grade: report.score?.grade ?? '?',
        byCode: histogram(report.findings.map((f) => f.code))
      };
    }
    results[c.name] = g;
  }
});

afterAll(async () => {
  // Scoreboard.
  const pad = (s: string, n: number) => s.padEnd(n);
  const head = pad('case', 16) + PRESETS.map((p) => pad(p.replace('safegres:', ''), 16)).join('');
  const lines = ['', head, '-'.repeat(head.length)];
  for (const c of CASES) {
    const row = PRESETS.map((p) => {
      const r = results[c.name][p];
      const n = Object.values(r.byCode).reduce((a, b) => a + b, 0);
      return pad(`${r.score}/${r.grade} (${n})`, 16);
    }).join('');
    lines.push(pad(c.name, 16) + row);
  }
  lines.push('', '(score/grade (findings) per preset)', '');
  console.log(lines.join('\n'));

  if (UPDATE) {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
    for (const c of CASES) {
      fs.writeFileSync(goldenPath(c.name), JSON.stringify(results[c.name], null, 2) + '\n');
    }
    console.log(`Updated ${CASES.length} goldens in ${GOLDEN_DIR}`);
  }
  if (teardown) await teardown();
});

describe('safegres evals', () => {
  for (const c of CASES) {
    it(`${c.name}: ${c.description}`, () => {
      if (UPDATE) return; // recording pass — assertions skipped
      const p = goldenPath(c.name);
      expect(fs.existsSync(p)).toBe(true);
      const expected = JSON.parse(fs.readFileSync(p, 'utf8')) as CaseGolden;
      expect(results[c.name]).toEqual(expected);
    });
  }
});
