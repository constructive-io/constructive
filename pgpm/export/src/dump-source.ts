/**
 * Dump ingestion for `pgpm import`: turn a `pg_dump` output file (or a
 * directory of .sql files, concatenated in sorted order) into parseable SQL
 * plus extracted data blocks. This is the file/dump front door of the "ingest
 * anything -> classified unit set" seam (`loadModuleSource` is the module
 * front door).
 *
 * Text-level preprocessing handles the two things libpg_query cannot parse:
 * - psql backslash meta-commands (`\connect`, `\restrict`, ...) — stripped
 *   and reported;
 * - `COPY ... FROM stdin;` data blocks — captured as a unit including the
 *   terminating `\.` so they can be re-emitted as seed fixtures.
 *
 * The scanner tracks dollar-quoted strings so function bodies containing
 * backslash-prefixed lines are left untouched.
 */
import * as fs from 'fs';
import * as path from 'path';

/** A `COPY ... FROM stdin;` block captured verbatim from the dump. */
export interface CopyBlock {
  /** The COPY statement line (without the data). */
  statement: string;
  /** Raw data lines between the statement and the terminating `\.`. */
  dataLines: string[];
}

/** A dump loaded and preprocessed into parseable SQL + data blocks. */
export interface DumpSource {
  /** Files the SQL was read from, in concatenation order. */
  files: string[];
  /** Parseable SQL: the dump minus meta-commands and COPY data blocks. */
  sql: string;
  /** COPY data blocks, in dump order. */
  copyBlocks: CopyBlock[];
  /** psql backslash meta-commands that were stripped, verbatim. */
  metaCommands: string[];
  /** Non-fatal notes. */
  warnings: string[];
}

const COPY_FROM_STDIN = /^COPY\s.+\bFROM\s+stdin\s*;\s*$/i;
const DOLLAR_TAG = /\$[A-Za-z_][A-Za-z_0-9]*\$|\$\$/g;

/** Advance the dollar-quote state across one line; returns the open tag or null. */
const trackDollarQuotes = (line: string, openTag: string | null): string | null => {
  let tag = openTag;
  DOLLAR_TAG.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = DOLLAR_TAG.exec(line)) !== null) {
    if (tag === null) {
      tag = match[0];
    } else if (match[0] === tag) {
      tag = null;
    }
  }
  return tag;
};

/**
 * Preprocess raw dump text: strip psql meta-commands, extract
 * `COPY ... FROM stdin;` data blocks (through their terminating `\.`), and
 * return the remaining SQL, which is parseable as a whole.
 */
export const preprocessDumpText = (text: string): Omit<DumpSource, 'files'> => {
  const sqlLines: string[] = [];
  const copyBlocks: CopyBlock[] = [];
  const metaCommands: string[] = [];
  const warnings: string[] = [];

  let openTag: string | null = null;
  let copy: CopyBlock | null = null;

  for (const line of text.split('\n')) {
    if (copy) {
      if (line === '\\.') {
        copyBlocks.push(copy);
        copy = null;
      } else {
        copy.dataLines.push(line);
      }
      continue;
    }

    if (openTag === null) {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('\\')) {
        metaCommands.push(trimmed);
        continue;
      }
      if (COPY_FROM_STDIN.test(trimmed)) {
        copy = { statement: trimmed, dataLines: [] };
        continue;
      }
    }

    openTag = trackDollarQuotes(line, openTag);
    sqlLines.push(line);
  }

  if (copy) {
    warnings.push(`COPY block "${copy.statement}" is missing its terminating \\. — its data was kept but may be truncated`);
    copyBlocks.push(copy);
  }

  return { sql: sqlLines.join('\n'), copyBlocks, metaCommands, warnings };
};

/**
 * Load a dump from a .sql file or a directory of .sql files. Directory
 * inputs are concatenated in sorted (lexicographic) filename order — name
 * files accordingly (e.g. `001-schema.sql`, `002-data.sql`).
 */
export const loadDumpSource = (inputPath: string): DumpSource => {
  const resolved = path.resolve(inputPath);
  const stat = fs.statSync(resolved);

  let files: string[];
  if (stat.isDirectory()) {
    files = fs
      .readdirSync(resolved)
      .filter(f => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b))
      .map(f => path.join(resolved, f));
    if (files.length === 0) {
      throw new Error(`No .sql files found in directory: ${resolved}`);
    }
  } else {
    files = [resolved];
  }

  const text = files.map(f => fs.readFileSync(f, 'utf-8')).join('\n');
  return { files, ...preprocessDumpText(text) };
};

const COPY_TARGET = /^COPY\s+(.+?)(?:\s*\(([^)]*)\))?\s+FROM\s+stdin\s*;\s*$/i;

/** The parsed target of a COPY statement. */
export interface CopyTarget {
  schema: string | null;
  name: string;
  /** Raw column list between the parens, or null when omitted. */
  columns: string | null;
}

/** Parse the table (and column list) a COPY block targets. */
export const copyTargetOf = (block: CopyBlock): CopyTarget => {
  const match = COPY_TARGET.exec(block.statement.trim());
  if (!match) {
    throw new Error(`Unrecognized COPY statement: ${block.statement}`);
  }
  const target = match[1].trim();
  const columns = match[2]?.trim() || null;
  const unquote = (s: string): string =>
    s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1).replace(/""/g, '"') : s;
  const parts = target.split('.').map(unquote);
  return parts.length > 1
    ? { schema: parts[0], name: parts.slice(1).join('.'), columns }
    : { schema: null, name: target, columns };
};

/** Decode one field of COPY text-format data (`\N` handled by the caller). */
const decodeCopyField = (field: string): string => {
  let out = '';
  for (let i = 0; i < field.length; i++) {
    const ch = field[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = field[++i];
    switch (next) {
      case 'b': out += '\b'; break;
      case 'f': out += '\f'; break;
      case 'n': out += '\n'; break;
      case 'r': out += '\r'; break;
      case 't': out += '\t'; break;
      case 'v': out += '\v'; break;
      case undefined: out += '\\'; break;
      default: out += next;
    }
  }
  return out;
};

const quoteLiteral = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/**
 * Convert a COPY block to an equivalent multi-row INSERT statement, so the
 * data can be deployed through the pg driver (which cannot stream
 * `COPY ... FROM stdin` inline data).
 */
export const copyBlockToInsert = (block: CopyBlock): string => {
  const match = COPY_TARGET.exec(block.statement.trim());
  if (!match) {
    throw new Error(`Unrecognized COPY statement: ${block.statement}`);
  }
  const target = match[1].trim();
  const columns = match[2]?.trim();

  const rows = block.dataLines
    .filter(line => line.length > 0)
    .map(line => {
      const values = line
        .split('\t')
        .map(field => (field === '\\N' ? 'NULL' : quoteLiteral(decodeCopyField(field))));
      return `(${values.join(', ')})`;
    });

  if (rows.length === 0) return '';

  const columnList = columns ? ` (${columns})` : '';
  return `INSERT INTO ${target}${columnList} VALUES\n  ${rows.join(',\n  ')};`;
};
