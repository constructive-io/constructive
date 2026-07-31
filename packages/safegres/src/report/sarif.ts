/**
 * SARIF 2.1.0 rendering (`--format sarif`), so findings land in GitHub code
 * scanning (Security tab + inline PR annotations) instead of only in a log.
 *
 * A code-scanning alert is a *file and a line*, but safegres reads the
 * catalog — a live database has no source location. `buildSourceIndex()`
 * closes that gap by scanning the SQL that produced the database
 * (pgpm deploy scripts, migrations) for the `CREATE TABLE` / `CREATE POLICY`
 * that defines each object, so `app_public.widgets` resolves to the line that
 * created it. Findings that don't resolve are still emitted, without a
 * location: GitHub drops those from the Security tab, but any other SARIF
 * consumer keeps them, and the JSON format carries everything regardless.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

import { findingKey, subjectOf } from '../perf/baseline';
import { RULES, dimensionOf } from '../rules/registry';
import type { Finding, Report, Severity } from '../types';

const SARIF_VERSION = '2.1.0';
const SCHEMA = 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json';

/** SARIF has three visible levels; five severities have to fold into them. */
const LEVEL: Record<Severity, 'error' | 'warning' | 'note'> = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'note',
  info: 'note'
};

/**
 * GitHub reads `security-severity` (a CVSS-shaped number) to bucket an alert
 * as critical/high/medium/low in the Security tab.
 */
const SECURITY_SEVERITY: Record<Severity, string> = {
  critical: '9.0',
  high: '7.0',
  medium: '5.0',
  low: '3.0',
  info: '1.0'
};

export interface SourceLocation {
  /** Repo-relative POSIX path, as GitHub expects it. */
  file: string;
  line: number;
}

/** `schema.table` → definition site, plus `schema.table:policy` for policies. */
export type SourceIndex = Map<string, SourceLocation>;

export interface RenderSarifOptions {
  /** Definition sites for relations and policies (see `buildSourceIndex`). */
  sources?: SourceIndex;
  /** Absolute URI of the scanned repository root, if known. */
  repoRoot?: string;
}

export function renderSarif(report: Report, options: RenderSarifOptions = {}): string {
  const findings = report.findings;
  const emitted = new Set(findings.map((f) => f.code));

  const sarif = {
    $schema: SCHEMA,
    version: SARIF_VERSION,
    runs: [
      {
        tool: {
          driver: {
            name: 'safegres',
            informationUri: 'https://github.com/constructive-io/constructive/tree/main/packages/safegres',
            semanticVersion: report.version,
            version: report.version,
            rules: RULES.filter((r) => emitted.has(r.code)).map((rule) => ({
              id: rule.code,
              name: rule.code,
              shortDescription: { text: rule.title },
              fullDescription: { text: rule.title },
              defaultConfiguration: { level: LEVEL[rule.defaultSeverity] },
              properties: {
                tags: [
                  dimensionOf(rule) === 'perf' ? 'performance' : 'security',
                  rule.category,
                  rule.direction
                ],
                'security-severity': SECURITY_SEVERITY[rule.defaultSeverity]
              }
            }))
          }
        },
        // Scores have nowhere to live in a SARIF result, so they ride along as
        // run properties — enough for a consumer to gate on.
        properties: {
          generatedAt: report.generatedAt,
          ...(report.score ? { score: report.score.value, grade: report.score.grade } : {}),
          ...(report.perf ? { perfScore: report.perf.score.value, perfGrade: report.perf.score.grade } : {})
        },
        results: findings.map((finding) => result(finding, options))
      }
    ]
  };

  return JSON.stringify(sarif, null, 2);
}

function result(finding: Finding, options: RenderSarifOptions) {
  const location = resolve(finding, options.sources);
  const relation = [finding.schema, finding.table].filter(Boolean).join('.');
  return {
    ruleId: finding.code,
    level: LEVEL[finding.severity],
    message: { text: relation ? `${relation}: ${finding.message}` : finding.message },
    ...(location
      ? {
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: location.file,
                ...(options.repoRoot ? { uriBaseId: '%SRCROOT%' } : {})
              },
              region: { startLine: location.line }
            }
          }
        ]
      }
      : { locations: [] }),
    // Identity, not text: the same key the perf baseline uses, so rewording a
    // rule doesn't resolve-and-reopen every alert.
    partialFingerprints: {
      safegresFindingKey: findingKey({
        code: finding.code,
        schema: finding.schema,
        table: finding.table,
        policy: finding.policy,
        subject: subjectOf(finding)
      })
    },
    properties: {
      severity: finding.severity,
      category: finding.category,
      dimension: finding.dimension ?? 'security',
      ...(finding.direction ? { direction: finding.direction } : {}),
      ...(finding.exposed === undefined ? {} : { exposed: finding.exposed }),
      ...(finding.acknowledged ? { acknowledged: true } : {}),
      ...(finding.policy ? { policy: finding.policy } : {}),
      ...(finding.role ? { role: finding.role } : {}),
      ...(finding.hint ? { hint: finding.hint } : {})
    }
  };
}

/** Policy site first — it's the precise line — then the table that owns it. */
function resolve(finding: Finding, sources?: SourceIndex): SourceLocation | undefined {
  if (!sources || !finding.schema || !finding.table) return undefined;
  const relation = `${finding.schema}.${finding.table}`;
  if (finding.policy) {
    const policy = sources.get(`${relation}:${finding.policy}`);
    if (policy) return policy;
  }
  return sources.get(relation);
}

const CREATE_TABLE = /^\s*create\s+(?:unlogged\s+|temp\w*\s+)?table\s+(?:if\s+not\s+exists\s+)?("?[\w$]+"?)\.("?[\w$]+"?)/i;
const CREATE_POLICY = /^\s*create\s+policy\s+("?[\w$]+"?)\s+on\s+("?[\w$]+"?)\.("?[\w$]+"?)/i;

export interface BuildSourceIndexOptions {
  /** Directory names to skip. Defaults to node_modules, .git, dist. */
  skipDirs?: string[];
  /** Paths in the index are relative to this. Defaults to `dir`. */
  root?: string;
}

/**
 * Scan a directory tree of `.sql` files for the statements that define the
 * objects safegres reports on. First definition wins: a pgpm module deploys a
 * table once, and a later `ALTER` is not where a reviewer wants the alert.
 */
export function buildSourceIndex(dir: string, options: BuildSourceIndexOptions = {}): SourceIndex {
  const skip = new Set(options.skipDirs ?? ['node_modules', '.git', 'dist']);
  const root = options.root ?? dir;
  const index: SourceIndex = new Map();

  const walk = (current: string): void => {
    for (const entry of readdirSync(current)) {
      if (skip.has(entry)) continue;
      const path = join(current, entry);
      const stat = statSync(path);
      if (stat.isDirectory()) walk(path);
      else if (entry.toLowerCase().endsWith('.sql')) scan(path, root, index);
    }
  };

  walk(dir);
  return index;
}

function scan(path: string, root: string, index: SourceIndex): void {
  const uri = relative(root, path).split(sep).join('/');
  const lines = readFileSync(path, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const table = CREATE_TABLE.exec(line);
    if (table) {
      add(index, `${unquote(table[1])}.${unquote(table[2])}`, uri, i + 1);
      return;
    }
    const policy = CREATE_POLICY.exec(line);
    if (policy) {
      const relation = `${unquote(policy[2])}.${unquote(policy[3])}`;
      add(index, `${relation}:${unquote(policy[1])}`, uri, i + 1);
    }
  });
}

function add(index: SourceIndex, key: string, file: string, line: number): void {
  if (!index.has(key)) index.set(key, { file, line });
}

function unquote(identifier: string): string {
  return identifier.startsWith('"') ? identifier.slice(1, -1) : identifier.toLowerCase();
}
