/**
 * Creates an `apply` function for a filter operator field.
 *
 * This is the core execution logic: given a PgCondition ($where) and an input value,
 * it resolves the SQL identifier, SQL value, and calls the operator's resolve function
 * to produce a SQL WHERE clause fragment, then applies it via `$where.where(fragment)`.
 *
 * The `pgFilterAttribute` extension on $where provides the context about which
 * column is being filtered, including the attribute name, codec, and any expression.
 */
export function makeApplyFromOperatorSpec(
  build: any,
  _typeName: string,
  fieldName: string,
  spec: any,
  _type: any
): any {
  const {
    sql,
    dataplanPg: { TYPES, sqlValueWithCodec },
    EXPORTABLE,
  } = build;
  const {
    resolve,
    resolveInput,
    resolveSqlIdentifier,
    resolveSqlValue,
    resolveInputCodec,
  } = spec;

  const { options: { connectionFilterAllowNullInput } } = build;

  return EXPORTABLE(
    (
      connectionFilterAllowNullInput: boolean,
      fieldName: string,
      resolve: any,
      resolveInput: any,
      resolveInputCodec: any,
      resolveSqlIdentifier: any,
      resolveSqlValue: any,
      sql: any,
      sqlValueWithCodec: any
    ) =>
      function ($where: any, value: any) {
        if (!$where.extensions?.pgFilterAttribute) {
          throw new Error(
            "Planning error: expected 'pgFilterAttribute' to be present on the $where plan's extensions; your extensions to the connection filter plugin do not implement the required interfaces."
          );
        }

        if (value === undefined) {
          return;
        }

        const {
          fieldName: parentFieldName,
          attributeName,
          attribute,
          codec,
          expression,
        } = $where.extensions.pgFilterAttribute;

        // Determine the SQL expression for the column
        const sourceAlias = attribute
          ? attribute.expression
            ? attribute.expression($where.alias)
            : sql`${$where.alias}.${sql.identifier(attributeName)}`
          : expression
            ? expression
            : $where.alias;

        const sourceCodec = codec ?? attribute.codec;

        // Optionally override the SQL identifier (e.g. cast citext to text)
        const [sqlIdentifier, identifierCodec] = resolveSqlIdentifier
          ? resolveSqlIdentifier(sourceAlias, sourceCodec)
          : [sourceAlias, sourceCodec];

        // Handle null input
        if (connectionFilterAllowNullInput && value === null) {
          return;
        }
        if (!connectionFilterAllowNullInput && value === null) {
          throw Object.assign(
            new Error('Null literals are forbidden in where argument input.'),
            {}
          );
        }

        // Optionally transform the input value
        const resolvedInput = resolveInput ? resolveInput(value) : value;

        // Determine the input codec
        const inputCodec = resolveInputCodec
          ? resolveInputCodec(codec ?? attribute.codec)
          : codec ?? attribute.codec;

        // Generate the SQL value
        const sqlValue = resolveSqlValue
          ? resolveSqlValue($where, value, inputCodec)
          : sqlValueWithCodec(resolvedInput, inputCodec);

        // Generate the WHERE clause fragment and apply it
        const fragment = resolve(sqlIdentifier, sqlValue, value, $where, {
          fieldName: parentFieldName ?? null,
          operatorName: fieldName,
        });

        $where.where(fragment);
      },
    [
      connectionFilterAllowNullInput,
      fieldName,
      resolve,
      resolveInput,
      resolveInputCodec,
      resolveSqlIdentifier,
      resolveSqlValue,
      sql,
      sqlValueWithCodec,
    ]
  );
}
