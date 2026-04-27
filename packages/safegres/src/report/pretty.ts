import yanse from 'yanse';

import type { Finding, Report, Severity } from '../types';

const SEV_LABEL: Record<Severity, string> = {
  critical: 'CRIT',
  high: 'HIGH',
  medium: 'MED ',
  low: 'LOW ',
  info: 'INFO'
};

type Painter = (s: string) => string;
const SEV_PAINT: Record<Severity, Painter> = {
  critical: (s) => yanse.bold(yanse.red(s)),
  high: yanse.red,
  medium: yanse.yellow,
  low: yanse.cyan,
  info: yanse.gray
};

const noop: Painter = (s) => s;

export function renderPretty(report: Report, options: { color?: boolean } = {}): string {
  const colorEnabled = options.color ?? process.stdout.isTTY === true;
  const paint = (sev: Severity, s: string) => (colorEnabled ? SEV_PAINT[sev](s) : noop(s));

  const { summary: s, findings } = report;
  const lines: string[] = [
    `safegres ${report.version}  (${report.generatedAt})`,
    '',
    `summary: ${paint('critical', String(s.critical))} critical  `
      + `${paint('high', String(s.high))} high  `
      + `${paint('medium', String(s.medium))} medium  `
      + `${paint('low', String(s.low))} low  `
      + `${paint('info', String(s.info))} info`,
    ''
  ];

  for (const f of findings) {
    lines.push(renderFinding(f, paint));
  }

  if (findings.length === 0) {
    lines.push('no findings.');
  }

  return lines.join('\n');
}

function renderFinding(f: Finding, paint: (sev: Severity, s: string) => string): string {
  const label = paint(f.severity, SEV_LABEL[f.severity]);
  const loc = [f.schema, f.table].filter(Boolean).join('.') + (f.policy ? `  (${f.policy})` : '');
  const head = `[${label}] ${f.code}  ${loc}`;
  const body = `    ${f.message}`;
  const hint = f.hint ? `    hint: ${f.hint}` : '';
  return [head, body, hint].filter(Boolean).join('\n');
}
