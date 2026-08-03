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
import type { StatementFacts } from '@pgsql/semantics';
import { classifyStatements } from '@pgsql/semantics';
import { Deparser, parseSql } from 'plpgsql-parser';

import { sliceStatementBytes, sqlSourceBytes } from './byte-slice';

/** A statement's location in the source script (byte offsets). */
export type SqlStatementSpan = StatementFacts['span'];

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
  const sourceBytes = sqlSourceBytes(source);
  const statements: SqlStatementAst[] = [];
  for (let i = 0; i < stmts.length; i++) {
    const rawStmt = stmts[i];
    if (!rawStmt?.stmt) continue;
    const { start, len } = facts[i].span;
    statements.push({
      stmt: rawStmt.stmt,
      facts: facts[i],
      span: { start, len },
      raw: sliceStatementBytes(sourceBytes, start, len),
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
  // Spans are UTF-8 byte offsets; slice statements and the verbatim gaps
  // between them on the bytes so a multibyte character never mis-cuts the
  // reassembly. Statement boundaries fall on character boundaries.
  const sourceBytes = sqlSourceBytes(source);
  const pieces: string[] = [];
  let cursor = 0;
  for (const statement of statements) {
    const { start, len } = statement.span;
    if (start > cursor) pieces.push(sliceStatementBytes(sourceBytes, cursor, start - cursor));
    pieces.push(
      statement.dirty
        ? Deparser.deparse(statement.stmt)
        : sliceStatementBytes(sourceBytes, start, len)
    );
    cursor = start + len;
  }
  if (cursor < sourceBytes.length) pieces.push(sliceStatementBytes(sourceBytes, cursor));
  return pieces.join('');
}
