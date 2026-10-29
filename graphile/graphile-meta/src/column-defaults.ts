import { asPgNode, parsePgNodeTree, type PgNode, type PgNodeValue } from './pg-node-tree';

/**
 * Whether a column default (`pg_attrdef.adbin`) is a constant: built only from
 * literals and casts, such as `1`, `'pending'`, `false`, `'{}'::jsonb`,
 * `ARRAY[]::text[]` or `0` on a `numeric(10,2)` column. A client picks such a
 * value in a form, so the column is data.
 *
 * Anything else is generated: a function call (`now()`, `gen_random_uuid()`,
 * `nextval(...)` behind serial), an SQL value function (`CURRENT_TIMESTAMP`,
 * `current_user`), an operator, or a node this reader doesn't know.
 */

// CoercionForm: COERCE_EXPLICIT_CAST and COERCE_IMPLICIT_CAST. A FUNCEXPR in
// either form is a cast or length coercion (`int8(int4)`, `numeric(numeric,
// int4)`), not a call the default was written with.
const CAST_FORMS = new Set(['1', '2']);

function isConstantNode(node: PgNode, inArrayCoerce = false): boolean {
  const fields = node.fields;
  switch (node.node) {
  case 'CONST':
    return true;
  case 'CASETESTEXPR':
    return inArrayCoerce;
  case 'RELABELTYPE':
  case 'COERCETODOMAIN':
  case 'COERCEVIAIO':
    return isConstantValue(fields.arg, inArrayCoerce);
  case 'ARRAYCOERCEEXPR':
    return isConstantValue(fields.arg, inArrayCoerce) && isConstantValue(fields.elemexpr, true);
  case 'ARRAYEXPR':
    return fields.elements === null || isConstantValue(fields.elements, inArrayCoerce);
  case 'FUNCEXPR':
    return (
      CAST_FORMS.has(fields.funcformat as string) &&
      (fields.args === null || isConstantValue(fields.args, inArrayCoerce))
    );
  default:
    return false;
  }
}

function isConstantValue(value: PgNodeValue | undefined, inArrayCoerce: boolean): boolean {
  if (Array.isArray(value)) return value.every((item) => isConstantValue(item, inArrayCoerce));
  const node = asPgNode(value);
  return !!node && isConstantNode(node, inArrayCoerce);
}

export function isConstantDefault(adbin: string): boolean {
  const expr = parsePgNodeTree(adbin);
  return !!expr && isConstantNode(expr);
}

export interface GeneratedColumnLike {
  attidentity?: string | null;
  attgenerated?: string | null;
}

/**
 * Whether the database generates the column's value: an identity column, a
 * generated column, or a default that isn't a constant (see
 * `isConstantDefault`). `adbin` is the column's `pg_attrdef.adbin`, if any.
 */
export function isGeneratedColumn(attribute: GeneratedColumnLike, adbin: string | null | undefined): boolean {
  if (attribute.attidentity || attribute.attgenerated) return true;
  return adbin != null && !isConstantDefault(adbin);
}
