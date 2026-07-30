/**
 * Statement-level SQL program AST.
 *
 * A `SqlProgram` is one parse of a SQL script into per-statement units, each
 * carrying its parsed node, semantic facts, source span, verbatim text, and a
 * dirty flag. Transformations mutate a statement's `stmt` node and mark it
 * dirty; emission re-prints only dirty statements through the deparser and
 * copies every other byte of the script verbatim (comments, whitespace,
 * untouched statements). A program with no dirty statements emits its source
 * byte-identically, so content-addressed hashes are preserved.
 */
import type { StatementFacts } from '@pgsql/transform';
import { classifyStatements } from '@pgsql/transform';
import { Deparser, parseSql } from 'plpgsql-parser';

/** A statement's location in the source script (byte offsets). */
export interface SqlStatementSpan {
  start: number;
  len: number;
}

/** One statement of a parsed SQL script. */
export interface SqlStatementAst {
  /** The tagged statement node (e.g. `{ CreateStmt: {...} }`), mutable. */
  stmt: any;
  /** Semantic facts classified from the statement. */
  facts: StatementFacts;
  /** Source span within the program's `source`. */
  span: SqlStatementSpan;
  /** Verbatim source text of the statement (`source.slice(start, start+len)`). */
  raw: string;
  /** Whether the statement's AST has been mutated and must be deparsed. */
  dirty: boolean;
}

/** A SQL script parsed once into statement units. */
export interface SqlProgram {
  source: string;
  statements: SqlStatementAst[];
}

/**
 * Parse a SQL script into a statement program. Requires `loadModule()` from
 * `plpgsql-parser` to have completed.
 */
export function parseSqlProgram(source: string): SqlProgram {
  const parseResult = parseSql(source);
  const stmts: any[] = parseResult?.stmts ?? [];
  const facts = classifyStatements(source);
  const statements: SqlStatementAst[] = [];
  for (let i = 0; i < stmts.length; i++) {
    const rawStmt = stmts[i];
    if (!rawStmt?.stmt) continue;
    const start = rawStmt.stmt_location ?? 0;
    const len = rawStmt.stmt_len ?? Math.max(0, source.length - start);
    statements.push({
      stmt: rawStmt.stmt,
      facts: facts[i],
      span: { start, len },
      raw: source.slice(start, start + len),
      dirty: false
    });
  }
  return { source, statements };
}

/**
 * Emit a program back to SQL. Clean statements — and every byte between
 * statements — are copied verbatim from the source; dirty statements are
 * re-printed through the deparser. With no dirty statements the output is
 * byte-identical to the source.
 */
export function emitSqlProgram(program: SqlProgram): string {
  const { source, statements } = program;
  if (!statements.some(s => s.dirty)) return source;
  const pieces: string[] = [];
  let cursor = 0;
  for (const statement of statements) {
    const { start, len } = statement.span;
    if (start > cursor) pieces.push(source.slice(cursor, start));
    pieces.push(statement.dirty ? Deparser.deparse(statement.stmt) : source.slice(start, start + len));
    cursor = start + len;
  }
  if (cursor < source.length) pieces.push(source.slice(cursor));
  return pieces.join('');
}
