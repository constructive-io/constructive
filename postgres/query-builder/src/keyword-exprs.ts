import { keywordKindOf } from '@pgsql/quotes';
import { nodes } from 'pg-ast';

// ---------------------------------------------------------------------------
// Keyword expressions
//
// PostgreSQL's grammar turns COALESCE/NULLIF/GREATEST/LEAST into dedicated parse
// nodes; no functions with those names exist. Building them as a FuncCall yields
// `"coalesce"(a, b)` — the deparser must quote a COL_NAME_KEYWORD — which parses
// but fails at runtime with `function coalesce(...) does not exist`. So the
// builder maps that family to its real nodes, and refuses any other keyword name
// that has no function behind it instead of emitting SQL that cannot resolve.
// ---------------------------------------------------------------------------

// Where a call lands in the statement. Keyword expressions are values, so they
// are only legal in expression position.
export type CallPosition = 'expression' | 'from';

type KeywordExprBuilder = (args: unknown[]) => unknown;

function requireArgCount(
  keyword: string,
  args: unknown[],
  min: number,
  max?: number
): void {
  if (args.length >= min && (max === undefined || args.length <= max)) return;
  const expected =
    max === undefined
      ? `at least ${min}`
      : min === max
        ? `exactly ${min}`
        : `between ${min} and ${max}`;
  throw new Error(
    `${keyword} requires ${expected} argument(s), received ${args.length}.`
  );
}

const KEYWORD_EXPR_BUILDERS: Record<string, KeywordExprBuilder> = {
  coalesce: (args) => {
    requireArgCount('COALESCE', args, 1);
    return nodes.coalesceExpr({ args: args as any[] });
  },
  nullif: (args) => {
    requireArgCount('NULLIF', args, 2, 2);
    return nodes.nullIfExpr({ args: args as any[] });
  },
  greatest: (args) => {
    requireArgCount('GREATEST', args, 1);
    return nodes.minMaxExpr({ args: args as any[], op: 'IS_GREATEST' as any });
  },
  least: (args) => {
    requireArgCount('LEAST', args, 1);
    return nodes.minMaxExpr({ args: args as any[], op: 'IS_LEAST' as any });
  }
};

// Keyword names that really are functions in pg_catalog, so the quoted call the
// deparser emits resolves and runs (verified against PostgreSQL 18 by
// intersecting pg_proc with the COL_NAME/RESERVED keyword lists). These stay
// FuncCall. Note that the function forms of EXTRACT/POSITION/SUBSTRING take
// their arguments positionally, which is not always the argument order the
// grammar uses: `position(a, b)` is `POSITION(b IN a)`.
const KEYWORD_FUNCTIONS = new Set([
  'bit',
  'char',
  'current_user',
  'extract',
  'interval',
  'json_object',
  'normalize',
  'numeric',
  'overlay',
  'position',
  'session_user',
  'substring',
  'system_user',
  'time',
  'timestamp',
  'varchar',
  'xmlexists'
]);

// Keyword constructs with neither a node mapping nor a function behind them,
// with the call to reach for instead.
const KEYWORD_ALTERNATIVES: Record<string, string> = {
  trim: `use fn('btrim'), fn('ltrim') or fn('rtrim')`,
  cast: `use cast(expr, 'type')`,
  collate: `no builder equivalent; select the collated expression from a view`
};

function isNamedArg(node: unknown): boolean {
  return !!node && typeof node === 'object' && 'NamedArgExpr' in (node as object);
}

// The node for a keyword-expression call, or undefined when `name` is an
// ordinary function name. Throws when the name is a keyword the builder has no
// node for and PostgreSQL has no function for, or when a keyword expression is
// used where only a function is legal.
export function keywordExprNode(
  name: string,
  args: unknown[],
  position: CallPosition
): unknown | undefined {
  const lower = name.toLowerCase();
  const build = KEYWORD_EXPR_BUILDERS[lower];
  const keyword = lower.toUpperCase();

  if (build) {
    if (position === 'from') {
      throw new Error(
        `${keyword}(...) is an expression, not a set-returning function, so it cannot appear in FROM. Select it as a computed column instead, e.g. .selectExpr('value', fn('${lower}', [...])).`
      );
    }
    if (args.some(isNamedArg)) {
      throw new Error(
        `${keyword}(...) does not accept named arguments; pass them positionally, e.g. fn('${lower}', [col('a'), col('b')]).`
      );
    }
    return build(args);
  }

  if (KEYWORD_FUNCTIONS.has(lower)) return undefined;

  const kind = keywordKindOf(lower);
  if (kind === 'COL_NAME_KEYWORD' || kind === 'RESERVED_KEYWORD') {
    const alternative =
      KEYWORD_ALTERNATIVES[lower] ??
      `use an equivalent regular function, or pass the schema explicitly (e.g. { schema: 'pg_catalog' }) if a function with this name really exists`;
    throw new Error(
      `'${name}' is a PostgreSQL ${kind}: ${keyword} is grammar, not a function, so the call would deparse to "${lower}"(...) and fail at runtime with "function ${lower}(...) does not exist". Instead, ${alternative}.`
    );
  }

  return undefined;
}
