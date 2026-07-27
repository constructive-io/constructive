import { readFileSync } from 'fs';
import { join } from 'path';

import { parsePlanFile } from '../plan/parser';
import { parseReference, ParsedReference } from '../plan/validators';

/**
 * A parsed `-- requires:` line from a pgpm SQL script header.
 */
export interface PgpmHeaderRequire {
  /** The dependency reference exactly as written (e.g. `schema`, `pkg:tables/users`, `pkg:@v1`). */
  raw: string;
  /** Structured breakdown of the reference (package/change/tag), when parseable. */
  ref: ParsedReference | null;
}

/**
 * The parsed header block of a pgpm SQL script (deploy/revert/verify).
 *
 * The header is everything from the top of the file through the last
 * header-relevant comment line (`-- Deploy|Revert|Verify ...`,
 * `-- requires: ...`, and any interleaved comment/blank lines), with the
 * remainder of the file preserved as `body`.
 */
export interface PgpmHeader {
  /** Header verb: Deploy, Revert or Verify. Null when no header line was found. */
  verb: 'Deploy' | 'Revert' | 'Verify' | null;
  /** The project (extension) name from `-- Deploy <project>:<change>`, if present. */
  project: string | null;
  /**
   * The change name from the header line. By convention this must equal the
   * script's path identity: `deploy/<change>.sql`.
   */
  change: string | null;
  /** Whether the header line carried the legacy ` to pg` suffix. */
  toPg: boolean;
  /** Parsed `-- requires:` dependencies, in file order. */
  requires: PgpmHeaderRequire[];
  /** The raw header lines, byte-exact, in file order. */
  lines: string[];
}

/**
 * Result of splitting a SQL script into header and body.
 */
export interface ParsedPgpmScript {
  header: PgpmHeader;
  /** Everything after the header block, byte-exact. */
  body: string;
}

const HEADER_LINE = /^--\s*(Deploy|Revert|Verify)\b(:)?\s*(.*?)\s*$/;
const REQUIRES_LINE = /^--\s*requires:\s*(.*?)\s*$/;
const COMMENT_LINE = /^\s*--/;
const TO_PG_SUFFIX = /\s+to\s+pg\s*$/;

/**
 * Parse the header block of a pgpm SQL script into a structured model.
 *
 * Recognizes both header formats:
 *   `-- Deploy <project>:<change> to pg` (legacy sqitch-compatible)
 *   `-- Deploy <change>` / `-- Deploy: <change>` (new)
 * along with `-- requires: <ref>` lines where `<ref>` may be a plain change
 * name, `{package}:{change}`, `@tag`, or `{package}:@tag`.
 *
 * The parse is lossless: `header.lines` plus `body` reassemble the original
 * content byte-exactly (see {@link writePgpmScript}).
 */
export function parsePgpmHeader(content: string): ParsedPgpmScript {
  const header: PgpmHeader = {
    verb: null,
    project: null,
    change: null,
    toPg: false,
    requires: [],
    lines: []
  };

  const lines = content.split('\n');
  let lastHeaderIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === '') {
      continue;
    }
    if (!COMMENT_LINE.test(line)) {
      break;
    }

    const headerMatch = line.match(HEADER_LINE);
    if (headerMatch && header.verb === null) {
      header.verb = headerMatch[1] as PgpmHeader['verb'];
      let target = headerMatch[3];
      if (TO_PG_SUFFIX.test(target)) {
        header.toPg = true;
        target = target.replace(TO_PG_SUFFIX, '');
      }
      const colonIndex = target.indexOf(':');
      if (colonIndex > 0 && /^[a-zA-Z0-9_-]+$/.test(target.substring(0, colonIndex))) {
        header.project = target.substring(0, colonIndex);
        header.change = target.substring(colonIndex + 1).trim();
      } else {
        header.change = target.trim() || null;
      }
      lastHeaderIdx = i;
      continue;
    }

    const requiresMatch = line.match(REQUIRES_LINE);
    if (requiresMatch) {
      const raw = requiresMatch[1];
      header.requires.push({ raw, ref: parseReference(raw) });
      lastHeaderIdx = i;
      continue;
    }
    // Other comment lines (e.g. attribution) before/between header lines are
    // tolerated but only absorbed into the header when a later header line
    // follows; trailing comments belong to the body.
  }

  header.lines = lines.slice(0, lastHeaderIdx + 1);
  return {
    header,
    body: lines.slice(lastHeaderIdx + 1).join('\n')
  };
}

/**
 * Serialize a header back to its raw lines. When the structured fields have
 * been modified via {@link renameInHeader}, the raw lines already reflect the
 * change; this simply joins header and body losslessly.
 */
export function writePgpmScript(script: ParsedPgpmScript): string {
  if (script.header.lines.length === 0) return script.body;
  return script.header.lines.join('\n') + '\n' + script.body;
}

/**
 * Rewrite change names in a script header according to a rename map
 * (old change name -> new change name). Rewrites both the `-- Deploy` line's
 * change identity and any `-- requires:` lines referencing renamed changes,
 * preserving format (project qualifier, ` to pg` suffix, tag refs untouched).
 *
 * Returns the number of substitutions applied; mutates `script` in place.
 */
export function renameInHeader(
  script: ParsedPgpmScript,
  renames: Map<string, string>
): number {
  const { header } = script;
  let count = 0;

  const renameRef = (raw: string): string | null => {
    const ref = parseReference(raw);
    if (!ref) {
      const to = renames.get(raw);
      return to ?? null;
    }
    if (ref.tag || ref.symbolic || ref.relative) return null;
    const change = ref.change;
    if (!change) return null;
    const to = renames.get(change);
    if (!to) return null;
    return ref.package ? `${ref.package}:${to}` : to;
  };

  header.lines = header.lines.map(line => {
    const headerMatch = line.match(HEADER_LINE);
    if (headerMatch && header.change && renames.has(header.change)) {
      const to = renames.get(header.change)!;
      const oldTarget = header.project ? `${header.project}:${header.change}` : header.change;
      const newTarget = header.project ? `${header.project}:${to}` : to;
      const rewritten = line.replace(oldTarget, newTarget);
      if (rewritten !== line) {
        header.change = to;
        count++;
        return rewritten;
      }
      return line;
    }

    const requiresMatch = line.match(REQUIRES_LINE);
    if (requiresMatch) {
      const raw = requiresMatch[1];
      const renamed = renameRef(raw);
      if (renamed !== null) {
        count++;
        return line.replace(raw, renamed);
      }
    }
    return line;
  });

  header.requires = header.requires.map(req => {
    const renamed = renameRef(req.raw);
    if (renamed === null) return req;
    return { raw: renamed, ref: parseReference(renamed) };
  });

  return count;
}

/**
 * Options for {@link scanDeployScript}.
 */
export interface ScanDeployScriptOptions {
  /** The script's path identity key (e.g. `/deploy/tables/users.sql`). */
  key: string;
  /** The current extension (project) name. */
  extname: string;
  /** Maps a change name to its path identity key. */
  makeKey: (change: string) => string;
}

/**
 * Scan a deploy script the way dependency resolution historically has:
 * line-by-line over the whole file, collecting `-- requires: <ref>` lines
 * verbatim and validating any `-- Deploy <project>:<change>[ to pg]` line
 * against the script's path identity and project name.
 *
 * Kept strictly line-regex-compatible with the original resolver behavior
 * (requires lines are honored anywhere in the file, and the legacy
 * `-- Deploy: <change>` colon form is not identity-validated).
 *
 * @throws when the Deploy line's project or change identity mismatches.
 */
export function scanDeployScript(
  content: string,
  options: ScanDeployScriptOptions
): { requires: string[] } {
  const { key, extname, makeKey } = options;
  const requires: string[] = [];

  for (const line of content.split('\n')) {
    const requiresMatch = line.match(/^-- requires: (.*)/);
    if (requiresMatch) {
      requires.push(requiresMatch[1].trim());
      continue;
    }

    if (/:/.test(line)) {
      const m2 = line.match(/^-- Deploy ([^:]*):([\w\/]+)(?:\s+to\s+pg)?/);
      if (m2) {
        const actualProject = m2[1];
        const keyToTest = m2[2];

        if (extname !== actualProject) {
          throw new Error(
            `Mismatched project name in deploy file:
          Expected project: ${extname}
          Found in line   : ${actualProject}
          Line            : ${line}`
          );
        }

        const expectedKey = makeKey(keyToTest);
        if (key !== expectedKey) {
          throw new Error(
            `Deployment script path or internal name mismatch:
          Expected key    : ${key}
          Found in line   : ${expectedKey}
          Line            : ${line}`
          );
        }
      }
    } else {
      const m2 = line.match(/^-- Deploy (.*?)(?:\s+to\s+pg)?\s*$/);
      if (m2) {
        const keyToTest = m2[1].trim();
        if (key !== makeKey(keyToTest)) {
          throw new Error(
            'deployment script in wrong place or is named wrong internally\n' + line
          );
        }
      }
    }
  }

  return { requires };
}

/**
 * A single plan-vs-header discrepancy found by {@link verifyPlanMatchesHeaders}.
 */
export interface HeaderDriftIssue {
  change: string;
  file: string;
  kind: 'missing-file' | 'identity-mismatch' | 'requires-drift';
  message: string;
}

/**
 * Verify that every change in a module's pgpm.plan has a deploy script whose
 * header identity matches its path, and report dependency drift between the
 * plan's dep lists and the scripts' `-- requires:` lines.
 *
 * Read-only diagnostic; returns issues rather than throwing.
 */
export function verifyPlanMatchesHeaders(moduleDir: string): HeaderDriftIssue[] {
  const issues: HeaderDriftIssue[] = [];
  const planPath = join(moduleDir, 'pgpm.plan');
  const parsed = parsePlanFile(planPath);
  if (!parsed.data) {
    throw new Error(`Failed to parse plan file: ${planPath}`);
  }

  for (const planChange of parsed.data.changes) {
    const change = planChange.name;
    const file = join(moduleDir, 'deploy', `${change}.sql`);
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      issues.push({
        change,
        file,
        kind: 'missing-file',
        message: `deploy script not found for plan change "${change}"`
      });
      continue;
    }

    const { header } = parsePgpmHeader(content);
    if (header.change && header.change !== change) {
      issues.push({
        change,
        file,
        kind: 'identity-mismatch',
        message: `header declares "${header.change}" but path identity is "${change}"`
      });
    }

    const planDeps = new Set(planChange.dependencies || []);
    const headerDeps = new Set(header.requires.map(r => r.raw));
    const missingInHeader = [...planDeps].filter(d => !headerDeps.has(d));
    const missingInPlan = [...headerDeps].filter(d => !planDeps.has(d));
    if (missingInHeader.length > 0 || missingInPlan.length > 0) {
      const parts: string[] = [];
      if (missingInHeader.length > 0) {
        parts.push(`in plan but not in header requires: ${missingInHeader.join(', ')}`);
      }
      if (missingInPlan.length > 0) {
        parts.push(`in header requires but not in plan: ${missingInPlan.join(', ')}`);
      }
      issues.push({
        change,
        file,
        kind: 'requires-drift',
        message: parts.join('; ')
      });
    }
  }

  return issues;
}
