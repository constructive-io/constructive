import type { Finding, Report, Severity } from '../types';

const SEV_LABEL: Record<Severity, string> = {
  critical: 'CRIT',
  high: 'HIGH',
  medium: 'MED ',
  low: 'LOW ',
  info: 'INFO'
};

export function renderPretty(report: Report, options: { color?: boolean } = {}): string {
  const color = options.color ?? (process.stdout.isTTY === true);
  const lines: string[] = [];
  lines.push(`safegres-audit ${report.version}  (${report.generatedAt})`);
  lines.push('');
  const s = report.summary;
  lines.push(
    `summary: ${paint(color, 'critical', String(s.critical))} critical  `
    + `${paint(color, 'high', String(s.high))} high  `
    + `${paint(color, 'medium', String(s.medium))} medium  `
    + `${paint(color, 'low', String(s.low))} low  `
    + `${paint(color, 'info', String(s.info))} info`
  );
  lines.push('');

  for (const f of report.findings) {
    lines.push(renderFinding(f, color));
  }

  if (report.findings.length === 0) {
    lines.push('no findings.');
  }

  return lines.join('\n');
}

function renderFinding(f: Finding, color: boolean): string {
  const label = paint(color, f.severity, SEV_LABEL[f.severity]);
  const loc = [f.schema, f.table].filter(Boolean).join('.') + (f.policy ? `  (${f.policy})` : '');
  const head = `[${label}] ${f.code}  ${loc}`;
  const body = `    ${f.message}`;
  const hint = f.hint ? `    hint: ${f.hint}` : '';
  return [head, body, hint].filter(Boolean).join('\n');
}

function paint(enable: boolean, severity: Severity, s: string): string {
  if (!enable) return s;
  const code: Record<Severity, string> = {
    critical: '\x1b[1;31m', // bold red
    high: '\x1b[31m',       // red
    medium: '\x1b[33m',     // yellow
    low: '\x1b[36m',        // cyan
    info: '\x1b[2m'         // dim
  };
  return `${code[severity]}${s}\x1b[0m`;
}
