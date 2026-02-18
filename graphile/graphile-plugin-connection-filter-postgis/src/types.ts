import type { SQL } from 'pg-sql2';

export interface PostgisFilterOperatorSpec {
  /** PostGIS SQL function name (e.g. 'ST_Contains') */
  sqlFunction?: string;
  /** SQL operator (e.g. '&&', '=') — used instead of sqlFunction for operator-based specs */
  sqlOperator?: string;
  /** GraphQL filter operator name (e.g. 'contains', 'bboxIntersects2D') */
  operatorName: string;
  /** Human-readable description of the operator */
  description: string;
  /** Which base types this operator applies to: 'geometry', 'geography', or both */
  baseTypes: ('geometry' | 'geography')[];
}

export interface ResolvedFilterSpec {
  /** GraphQL type names this operator applies to (interface + all concrete types) */
  typeNames: string[];
  /** GraphQL filter operator name */
  operatorName: string;
  /** Description */
  description: string;
  /** SQL resolve function: (identifier, value) => SQL expression */
  resolve: (i: SQL, v: SQL) => SQL;
}
