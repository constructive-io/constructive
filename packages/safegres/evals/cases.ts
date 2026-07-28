/**
 * Eval cases: each is a self-contained SQL fixture deployed into its own
 * schema, audited under every preset. Goldens live in `evals/golden/` and
 * capture the resolved score/grade plus a finding-count histogram per preset
 * — enough to catch scoring drift and rule regressions without being brittle
 * about finding ordering or messages.
 */

export interface EvalCase {
  /** Stable id; also the golden filename. */
  name: string;
  /** Schema the fixture creates (audit is scoped to it). */
  schema: string;
  /** SQL fixture filename under evals/fixtures/. */
  file: string;
  description: string;
}

export const PRESETS = [
  'safegres:recommended',
  'safegres:strict',
  'safegres:constructive',
  'safegres:minimal'
] as const;

export type PresetName = (typeof PRESETS)[number];

export const CASES: EvalCase[] = [
  {
    name: 'secure-app',
    schema: 'eval_secure',
    file: 'secure-app.sql',
    description: 'Well-designed RLS app — should score near-perfect everywhere.'
  },
  {
    name: 'leaky-app',
    schema: 'eval_leaky',
    file: 'leaky-app.sql',
    description: 'Common RLS mistakes across several tables — should score poorly.'
  },
  {
    name: 'anon-exposed',
    schema: 'eval_anon',
    file: 'anon-exposed.sql',
    description: 'Untrusted anonymous role wired into a table — only constructive catches it.'
  }
];
