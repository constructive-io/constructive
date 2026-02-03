/**
 * PgConnectionArgFilterOperatorsPlugin for Graphile v5
 *
 * This plugin defines all comparison operators for connection filters including:
 * - Standard operators (isNull, equalTo, notEqualTo, distinctFrom, notDistinctFrom, in, notIn)
 * - Sort operators (lessThan, lessThanOrEqualTo, greaterThan, greaterThanOrEqualTo)
 * - Pattern matching operators (includes, startsWith, endsWith, like, etc.)
 * - Case-insensitive variants of standard, sort, and pattern operators
 * - Array operators (contains, containedBy, overlaps, anyEqualTo, etc.)
 * - Range operators (contains, containsElement, overlaps, strictlyLeftOf, etc.)
 * - Inet operators (contains, containedBy, containsOrEqualTo, etc.)
 * - JSON/JSONB operators (contains, containsKey, containsAllKeys, etc.)
 * - HStore operators (contains, containsKey, containsAllKeys, etc.)
 */

import type { PgCodec, PgCondition, PgConditionCapableParent } from '@dataplan/pg';
import type { InputObjectFieldApplyResolver } from 'grafast';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-build';
import type { GraphQLInputType } from 'graphql';
import type { SQL } from 'pg-sql2';

import type { OperatorSpec } from './types';

const version = '4.0.0';

/**
 * Creates an apply resolver function from an operator spec.
 * This function generates the SQL condition when a filter operator is used.
 */
export function makeApplyFromOperatorSpec(
  build: GraphileBuild.Build,
  typeName: string,
  fieldName: string,
  spec: OperatorSpec,
  _type: GraphQLInputType
): InputObjectFieldApplyResolver<PgCondition> {
  const {
    sql,
    dataplanPg: { sqlValueWithCodec },
    EXPORTABLE,
    options: { connectionFilterAllowNullInput },
  } = build;

  const {
    resolve,
    resolveInput,
    resolveInputCodec,
    resolveSqlIdentifier,
    resolveSqlValue,
  } = spec;

  return EXPORTABLE(
    (
      connectionFilterAllowNullInput,
      fieldName,
      resolve,
      resolveInput,
      resolveInputCodec,
      resolveSqlIdentifier,
      resolveSqlValue,
      sql,
      sqlValueWithCodec
    ) =>
      function (
        $where: PgCondition,
        value: unknown
      ): void {
        if (!$where.extensions?.pgFilterAttribute) {
          throw new Error(
            `Planning error: expected 'pgFilterAttribute' to be present on the $where plan's extensions; your extensions to \`postgraphile-plugin-connection-filter\` does not implement the required interfaces.`
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

        // Build the source SQL alias (column reference)
        const sourceAlias: SQL = attribute
          ? attribute.expression
            ? attribute.expression($where.alias)
            : sql`${$where.alias}.${sql.identifier(attributeName)}`
          : expression
            ? expression
            : $where.alias;

        const sourceCodec = codec ?? attribute.codec;

        // Resolve SQL identifier (may transform for case-sensitivity, etc.)
        const [sqlIdentifier, identifierCodec] = resolveSqlIdentifier
          ? resolveSqlIdentifier(sourceAlias, sourceCodec)
          : [sourceAlias, sourceCodec];

        // Handle null input
        if (connectionFilterAllowNullInput && value === null) {
          // Don't add a filter when null is allowed and provided
          return;
        }

        if (!connectionFilterAllowNullInput && value === null) {
          throw Object.assign(
            new Error('Null literals are forbidden in filter argument input.'),
            { extensions: { isSafeError: true } }
          );
        }

        // Transform input if needed
        const resolvedInput = resolveInput ? resolveInput(value) : value;

        // Determine input codec
        const inputCodec = resolveInputCodec
          ? resolveInputCodec(codec ?? attribute.codec)
          : codec ?? attribute.codec;

        // Generate SQL value
        const sqlValue = resolveSqlValue
          ? resolveSqlValue($where, value, inputCodec)
          : sqlValueWithCodec(resolvedInput, inputCodec);

        // Generate and apply the SQL condition fragment
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

/**
 * PgConnectionArgFilterOperatorsPlugin
 *
 * Defines all filter operators for scalar types, arrays, ranges, enums, etc.
 * Uses the v5 plugin format with GraphQLInputObjectType_fields hook.
 */
export const PgConnectionArgFilterOperatorsPlugin: GraphileConfig.Plugin = {
  name: 'PgConnectionArgFilterOperatorsPlugin',
  version,
  schema: {
    hooks: {
      GraphQLInputObjectType_fields(fields, build, context) {
        const {
          extend,
          graphql: { GraphQLNonNull, GraphQLList, isListType, isNonNullType },
          dataplanPg: { isEnumCodec, listOfCodec, TYPES, sqlValueWithCodec },
          sql,
          escapeLikeWildcards,
          options: {
            connectionFilterAllowedOperators,
            connectionFilterOperatorNames,
          },
          EXPORTABLE,
        } = build;

        const {
          scope: { pgConnectionFilterOperators },
          fieldWithHooks,
          Self,
        } = context;

        // Only process filter operator types
        if (!pgConnectionFilterOperators) {
          return fields;
        }

        // =========================================================================
        // Helper functions (EXPORTABLE for tree-shaking)
        // =========================================================================

        /** Transform [Foo] to [Foo!] for list inputs */
        const resolveTypeToListOfNonNullable = EXPORTABLE(
          (GraphQLList, GraphQLNonNull, isListType, isNonNullType) =>
            function (type: GraphQLInputType): GraphQLInputType {
              if (isListType(type) && !isNonNullType(type.ofType)) {
                return new GraphQLList(new GraphQLNonNull(type.ofType));
              }
              return type;
            },
          [GraphQLList, GraphQLNonNull, isListType, isNonNullType]
        );

        // Types that need special handling for case-sensitive comparisons
        const forceTextTypesSensitive = [TYPES.citext, TYPES.char, TYPES.bpchar];

        // Types that need special handling for case-insensitive comparisons
        const forceTextTypesInsensitive = [TYPES.char, TYPES.bpchar];

        /** Resolve domain types to their base type */
        const resolveDomains = EXPORTABLE(
          () =>
            function (c: PgCodec<any, any, any, any, any, any, any>): PgCodec<any, any, any, any, any, any, any> {
              let current = c;
              while (current.domainOfCodec) {
                current = current.domainOfCodec;
              }
              return current;
            },
          []
        );

        /** Resolve input codec for array "in" operations (sensitive) */
        const resolveArrayInputCodecSensitive = EXPORTABLE(
          (TYPES, forceTextTypesSensitive, listOfCodec, resolveDomains) =>
            function (c: PgCodec<any, any, any, any, any, any, any>): PgCodec<any, any, any, any, any, any, any> {
              if (forceTextTypesSensitive.includes(resolveDomains(c))) {
                return listOfCodec(TYPES.text, {
                  extensions: { listItemNonNull: true },
                });
              }
              return listOfCodec(c, {
                extensions: { listItemNonNull: true },
              });
            },
          [TYPES, forceTextTypesSensitive, listOfCodec, resolveDomains]
        );

        /** Resolve input codec for array item operations (sensitive) */
        const resolveArrayItemInputCodecSensitive = EXPORTABLE(
          (TYPES, forceTextTypesSensitive, resolveDomains) =>
            function (c: PgCodec<any, any, any, any, any, any, any>): PgCodec<any, any, any, any, any, any, any> {
              if (c.arrayOfCodec) {
                if (forceTextTypesSensitive.includes(resolveDomains(c.arrayOfCodec))) {
                  return TYPES.text;
                }
                return c.arrayOfCodec;
              }
              throw new Error('Expected array codec');
            },
          [TYPES, forceTextTypesSensitive, resolveDomains]
        );

        /** Resolve input codec for case-sensitive operations */
        const resolveInputCodecSensitive = EXPORTABLE(
          (TYPES, forceTextTypesSensitive, listOfCodec, resolveDomains) =>
            function (c: PgCodec<any, any, any, any, any, any, any>): PgCodec<any, any, any, any, any, any, any> {
              if (c.arrayOfCodec) {
                if (forceTextTypesSensitive.includes(resolveDomains(c.arrayOfCodec))) {
                  return listOfCodec(TYPES.text, {
                    extensions: { listItemNonNull: c.extensions?.listItemNonNull },
                  });
                }
                return c;
              }
              if (forceTextTypesSensitive.includes(resolveDomains(c))) {
                return TYPES.text;
              }
              return c;
            },
          [TYPES, forceTextTypesSensitive, listOfCodec, resolveDomains]
        );

        /** Resolve SQL identifier for case-sensitive operations */
        const resolveSqlIdentifierSensitive = EXPORTABLE(
          (TYPES, forceTextTypesSensitive, listOfCodec, resolveDomains, sql) =>
            function (
              identifier: SQL,
              c: PgCodec<any, any, any, any, any, any, any>
            ): readonly [SQL, PgCodec<any, any, any, any, any, any, any>] {
              if (
                c.arrayOfCodec &&
                forceTextTypesSensitive.includes(resolveDomains(c.arrayOfCodec))
              ) {
                return [
                  sql`(${identifier})::text[]`,
                  listOfCodec(TYPES.text, {
                    extensions: { listItemNonNull: c.extensions?.listItemNonNull },
                  }),
                ];
              }
              if (forceTextTypesSensitive.includes(resolveDomains(c))) {
                return [sql`(${identifier})::text`, TYPES.text];
              }
              return [identifier, c];
            },
          [TYPES, forceTextTypesSensitive, listOfCodec, resolveDomains, sql]
        );

        /** Resolve input codec for case-insensitive operations */
        const resolveInputCodecInsensitive = EXPORTABLE(
          (TYPES, forceTextTypesInsensitive, listOfCodec, resolveDomains) =>
            function (c: PgCodec<any, any, any, any, any, any, any>): PgCodec<any, any, any, any, any, any, any> {
              if (c.arrayOfCodec) {
                if (forceTextTypesInsensitive.includes(resolveDomains(c.arrayOfCodec))) {
                  return listOfCodec(TYPES.text, {
                    extensions: { listItemNonNull: c.extensions?.listItemNonNull },
                  });
                }
                return c;
              }
              if (forceTextTypesInsensitive.includes(resolveDomains(c))) {
                return TYPES.text;
              }
              return c;
            },
          [TYPES, forceTextTypesInsensitive, listOfCodec, resolveDomains]
        );

        /** Resolve SQL identifier for case-insensitive operations */
        const resolveSqlIdentifierInsensitive = EXPORTABLE(
          (TYPES, forceTextTypesInsensitive, listOfCodec, resolveDomains, sql) =>
            function (
              identifier: SQL,
              c: PgCodec<any, any, any, any, any, any, any>
            ): readonly [SQL, PgCodec<any, any, any, any, any, any, any>] {
              if (
                c.arrayOfCodec &&
                forceTextTypesInsensitive.includes(resolveDomains(c.arrayOfCodec))
              ) {
                return [
                  sql`(${identifier})::text[]`,
                  listOfCodec(TYPES.text, {
                    extensions: { listItemNonNull: c.extensions?.listItemNonNull },
                  }),
                ];
              }
              if (forceTextTypesInsensitive.includes(resolveDomains(c))) {
                return [sql`(${identifier})::text`, TYPES.text];
              }
              return [identifier, c];
            },
          [TYPES, forceTextTypesInsensitive, listOfCodec, resolveDomains, sql]
        );

        // =========================================================================
        // Standard Operators
        // =========================================================================

        const standardOperators: { [fieldName: string]: OperatorSpec } = {
          isNull: {
            description:
              'Is null (if `true` is specified) or is not null (if `false` is specified).',
            resolveInputCodec: EXPORTABLE(
              (TYPES) => () => TYPES.boolean,
              [TYPES]
            ),
            resolveSqlValue: EXPORTABLE((sql) => () => sql.null, [sql]),
            resolve: EXPORTABLE(
              (sql) => (i, _v, input) =>
                sql`${i} ${input ? sql`IS NULL` : sql`IS NOT NULL`}`,
              [sql]
            ),
          },
          equalTo: {
            description: 'Equal to the specified value.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} = ${v}`, [sql]),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
          notEqualTo: {
            description: 'Not equal to the specified value.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} <> ${v}`, [sql]),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
          distinctFrom: {
            description:
              'Not equal to the specified value, treating null like an ordinary value.',
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${i} IS DISTINCT FROM ${v}`,
              [sql]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
          notDistinctFrom: {
            description:
              'Equal to the specified value, treating null like an ordinary value.',
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${i} IS NOT DISTINCT FROM ${v}`,
              [sql]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
          in: {
            description: 'Included in the specified list.',
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${i} = ANY(${v})`,
              [sql]
            ),
            resolveInputCodec: resolveArrayInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolveType: resolveTypeToListOfNonNullable,
          },
          notIn: {
            description: 'Not included in the specified list.',
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${i} <> ALL(${v})`,
              [sql]
            ),
            resolveInputCodec: resolveArrayInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolveType: resolveTypeToListOfNonNullable,
          },
        };

        // =========================================================================
        // Sort Operators
        // =========================================================================

        const sortOperators: { [fieldName: string]: OperatorSpec } = {
          lessThan: {
            description: 'Less than the specified value.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} < ${v}`, [sql]),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
          lessThanOrEqualTo: {
            description: 'Less than or equal to the specified value.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} <= ${v}`, [sql]),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
          greaterThan: {
            description: 'Greater than the specified value.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} > ${v}`, [sql]),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
          greaterThanOrEqualTo: {
            description: 'Greater than or equal to the specified value.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} >= ${v}`, [sql]),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
        };

        // =========================================================================
        // Pattern Matching Operators (for text-like types)
        // =========================================================================

        const patternMatchingOperators: { [fieldName: string]: OperatorSpec } = {
          includes: {
            description: 'Contains the specified string (case-sensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards) => (input) =>
                `%${escapeLikeWildcards(input)}%`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} LIKE ${v}`, [sql]),
          },
          notIncludes: {
            description: 'Does not contain the specified string (case-sensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards) => (input) =>
                `%${escapeLikeWildcards(input)}%`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${i} NOT LIKE ${v}`,
              [sql]
            ),
          },
          includesInsensitive: {
            description: 'Contains the specified string (case-insensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards) => (input) =>
                `%${escapeLikeWildcards(input)}%`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecInsensitive,
            resolveSqlIdentifier: resolveSqlIdentifierInsensitive,
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} ILIKE ${v}`, [sql]),
          },
          notIncludesInsensitive: {
            description:
              'Does not contain the specified string (case-insensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards) => (input) =>
                `%${escapeLikeWildcards(input)}%`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecInsensitive,
            resolveSqlIdentifier: resolveSqlIdentifierInsensitive,
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${i} NOT ILIKE ${v}`,
              [sql]
            ),
          },
          startsWith: {
            description: 'Starts with the specified string (case-sensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards) => (input) =>
                `${escapeLikeWildcards(input)}%`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} LIKE ${v}`, [sql]),
          },
          notStartsWith: {
            description:
              'Does not start with the specified string (case-sensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards) => (input) =>
                `${escapeLikeWildcards(input)}%`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${i} NOT LIKE ${v}`,
              [sql]
            ),
          },
          startsWithInsensitive: {
            description: 'Starts with the specified string (case-insensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards) => (input) =>
                `${escapeLikeWildcards(input)}%`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecInsensitive,
            resolveSqlIdentifier: resolveSqlIdentifierInsensitive,
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} ILIKE ${v}`, [sql]),
          },
          notStartsWithInsensitive: {
            description:
              'Does not start with the specified string (case-insensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards) => (input) =>
                `${escapeLikeWildcards(input)}%`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecInsensitive,
            resolveSqlIdentifier: resolveSqlIdentifierInsensitive,
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${i} NOT ILIKE ${v}`,
              [sql]
            ),
          },
          endsWith: {
            description: 'Ends with the specified string (case-sensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards) => (input) =>
                `%${escapeLikeWildcards(input)}`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} LIKE ${v}`, [sql]),
          },
          notEndsWith: {
            description:
              'Does not end with the specified string (case-sensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards) => (input) =>
                `%${escapeLikeWildcards(input)}`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${i} NOT LIKE ${v}`,
              [sql]
            ),
          },
          endsWithInsensitive: {
            description: 'Ends with the specified string (case-insensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards) => (input) =>
                `%${escapeLikeWildcards(input)}`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecInsensitive,
            resolveSqlIdentifier: resolveSqlIdentifierInsensitive,
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} ILIKE ${v}`, [sql]),
          },
          notEndsWithInsensitive: {
            description:
              'Does not end with the specified string (case-insensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards) => (input) =>
                `%${escapeLikeWildcards(input)}`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecInsensitive,
            resolveSqlIdentifier: resolveSqlIdentifierInsensitive,
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${i} NOT ILIKE ${v}`,
              [sql]
            ),
          },
          like: {
            description:
              'Matches the specified pattern (case-sensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters.',
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} LIKE ${v}`, [sql]),
          },
          notLike: {
            description:
              'Does not match the specified pattern (case-sensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters.',
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${i} NOT LIKE ${v}`,
              [sql]
            ),
          },
          likeInsensitive: {
            description:
              'Matches the specified pattern (case-insensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters.',
            resolveInputCodec: resolveInputCodecInsensitive,
            resolveSqlIdentifier: resolveSqlIdentifierInsensitive,
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} ILIKE ${v}`, [sql]),
          },
          notLikeInsensitive: {
            description:
              'Does not match the specified pattern (case-insensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters.',
            resolveInputCodec: resolveInputCodecInsensitive,
            resolveSqlIdentifier: resolveSqlIdentifierInsensitive,
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${i} NOT ILIKE ${v}`,
              [sql]
            ),
          },
        };

        // =========================================================================
        // HStore Operators
        // =========================================================================

        const resolveTextArrayInputCodec = EXPORTABLE(
          (TYPES, listOfCodec) => () =>
            listOfCodec(TYPES.text, { extensions: { listItemNonNull: true } }),
          [TYPES, listOfCodec]
        );

        const hstoreOperators: { [fieldName: string]: OperatorSpec } = {
          contains: {
            description: 'Contains the specified KeyValueHash.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} @> ${v}`, [sql]),
          },
          containsKey: {
            description: 'Contains the specified key.',
            resolveInputCodec: EXPORTABLE(
              (TYPES) => () => TYPES.text,
              [TYPES]
            ),
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} ? ${v}`, [sql]),
          },
          containsAllKeys: {
            name: 'containsAllKeys',
            description: 'Contains all of the specified keys.',
            resolveInputCodec: resolveTextArrayInputCodec,
            resolveType: resolveTypeToListOfNonNullable,
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} ?& ${v}`, [sql]),
          },
          containsAnyKeys: {
            name: 'containsAnyKeys',
            description: 'Contains any of the specified keys.',
            resolveInputCodec: resolveTextArrayInputCodec,
            resolveType: resolveTypeToListOfNonNullable,
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} ?| ${v}`, [sql]),
          },
          containedBy: {
            description: 'Contained by the specified KeyValueHash.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} <@ ${v}`, [sql]),
          },
        };

        // =========================================================================
        // JSONB Operators
        // =========================================================================

        const jsonbOperators: { [fieldName: string]: OperatorSpec } = {
          contains: {
            description: 'Contains the specified JSON.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} @> ${v}`, [sql]),
          },
          containsKey: {
            description: 'Contains the specified key.',
            resolveInputCodec: EXPORTABLE(
              (TYPES) => () => TYPES.text,
              [TYPES]
            ),
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} ? ${v}`, [sql]),
          },
          containsAllKeys: {
            name: 'containsAllKeys',
            description: 'Contains all of the specified keys.',
            resolveInputCodec: resolveTextArrayInputCodec,
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} ?& ${v}`, [sql]),
          },
          containsAnyKeys: {
            name: 'containsAnyKeys',
            description: 'Contains any of the specified keys.',
            resolveInputCodec: resolveTextArrayInputCodec,
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} ?| ${v}`, [sql]),
          },
          containedBy: {
            description: 'Contained by the specified JSON.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} <@ ${v}`, [sql]),
          },
        };

        // =========================================================================
        // Inet Operators (for cidr, inet, macaddr, macaddr8)
        // =========================================================================

        const inetOperators: { [fieldName: string]: OperatorSpec } = {
          contains: {
            description: 'Contains the specified internet address.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} >> ${v}`, [sql]),
          },
          containsOrEqualTo: {
            description: 'Contains or equal to the specified internet address.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} >>= ${v}`, [sql]),
          },
          containedBy: {
            description: 'Contained by the specified internet address.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} << ${v}`, [sql]),
          },
          containedByOrEqualTo: {
            description:
              'Contained by or equal to the specified internet address.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} <<= ${v}`, [sql]),
          },
          containsOrContainedBy: {
            description:
              'Contains or contained by the specified internet address.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} && ${v}`, [sql]),
          },
        };

        // =========================================================================
        // Case-Insensitive Standard/Sort Operators
        // =========================================================================

        /**
         * Generate case-insensitive variants of standard and sort operators.
         *
         * These operators use lower() for text/varchar/char columns
         * but are no-ops for citext columns (already case-insensitive).
         *
         * Operators generated:
         * - distinctFromInsensitive
         * - equalToInsensitive
         * - greaterThanInsensitive
         * - greaterThanOrEqualToInsensitive
         * - inInsensitive
         * - lessThanInsensitive
         * - lessThanOrEqualToInsensitive
         * - notDistinctFromInsensitive
         * - notEqualToInsensitive
         * - notInInsensitive
         */
        const insensitiveOperators: { [fieldName: string]: OperatorSpec } = {};

        for (const [name, spec] of [
          ...Object.entries(standardOperators),
          ...Object.entries(sortOperators),
        ]) {
          if (name === 'isNull') continue;

          const description = `${spec.description.substring(
            0,
            spec.description.length - 1
          )} (case-insensitive).`;

          const resolveSqlIdentifier = EXPORTABLE(
            (TYPES, resolveDomains, sql) =>
              function (
                sourceAlias: SQL,
                codec: PgCodec<any, any, any, any, any, any, any>
              ): readonly [SQL, PgCodec<any, any, any, any, any, any, any>] {
                return resolveDomains(codec) === TYPES.citext
                  ? [sourceAlias, codec] // already case-insensitive
                  : [sql`lower(${sourceAlias}::text)`, TYPES.text];
              },
            [TYPES, resolveDomains, sql]
          );

          const resolveSqlValue = EXPORTABLE(
            (TYPES, name, sql, sqlValueWithCodec) =>
              function (
                _unused: PgConditionCapableParent,
                input: unknown,
                inputCodec: PgCodec<any, any, any, any, any, any, any>
              ): SQL {
                if (name === 'in' || name === 'notIn') {
                  const sqlList = sqlValueWithCodec(input, inputCodec);
                  if (inputCodec.arrayOfCodec === TYPES.citext) {
                    // already case-insensitive
                    return sqlList;
                  }
                  // Use subquery for case-insensitive array comparison
                  return sql`(select lower(t) from unnest(${sqlList}) t)`;
                }
                const sqlValue = sqlValueWithCodec(input, inputCodec);
                if (inputCodec === TYPES.citext) {
                  // already case-insensitive
                  return sqlValue;
                }
                return sql`lower(${sqlValue})`;
              },
            [TYPES, name, sql, sqlValueWithCodec]
          );

          const resolveInputCodec = EXPORTABLE(
            (TYPES, listOfCodec, name, resolveDomains) =>
              function (
                inputCodec: PgCodec<any, any, any, any, any, any, any>
              ): PgCodec<any, any, any, any, any, any, any> {
                if (name === 'in' || name === 'notIn') {
                  const t =
                    resolveDomains(inputCodec) === TYPES.citext
                      ? inputCodec
                      : TYPES.text;
                  return listOfCodec(t, {
                    extensions: { listItemNonNull: true },
                  });
                }
                return resolveDomains(inputCodec) === TYPES.citext
                  ? inputCodec
                  : TYPES.text;
              },
            [TYPES, listOfCodec, name, resolveDomains]
          );

          insensitiveOperators[`${name}Insensitive`] = {
            ...spec,
            description,
            resolveInputCodec,
            resolveSqlIdentifier,
            resolveSqlValue,
          };
        }

        // =========================================================================
        // Enum Operators
        // =========================================================================

        const connectionFilterEnumOperators: { [fieldName: string]: OperatorSpec } = {
          ...standardOperators,
          ...sortOperators,
        };

        // =========================================================================
        // Range Operators
        // =========================================================================

        const connectionFilterRangeOperators: { [fieldName: string]: OperatorSpec } = {
          ...standardOperators,
          ...sortOperators,
          contains: {
            description: 'Contains the specified range.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} @> ${v}`, [sql]),
          },
          containsElement: {
            description: 'Contains the specified value.',
            resolveInputCodec: EXPORTABLE(
              () =>
                function (
                  c: PgCodec<any, any, any, any, any, any, any>
                ): PgCodec<any, any, any, any, any, any, any> {
                  if (c.rangeOfCodec) {
                    return c.rangeOfCodec;
                  }
                  throw new Error(
                    "Couldn't determine the range element type to use"
                  );
                },
              []
            ),
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} @> ${v}`, [sql]),
          },
          containedBy: {
            description: 'Contained by the specified range.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} <@ ${v}`, [sql]),
          },
          overlaps: {
            description: 'Overlaps the specified range.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} && ${v}`, [sql]),
          },
          strictlyLeftOf: {
            description: 'Strictly left of the specified range.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} << ${v}`, [sql]),
          },
          strictlyRightOf: {
            description: 'Strictly right of the specified range.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} >> ${v}`, [sql]),
          },
          notExtendsRightOf: {
            description: 'Does not extend right of the specified range.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} &< ${v}`, [sql]),
          },
          notExtendsLeftOf: {
            description: 'Does not extend left of the specified range.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} &> ${v}`, [sql]),
          },
          adjacentTo: {
            description: 'Adjacent to the specified range.',
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} -|- ${v}`, [sql]),
          },
        };

        // =========================================================================
        // Array Operators
        // =========================================================================

        const connectionFilterArrayOperators: { [fieldName: string]: OperatorSpec } = {
          isNull: standardOperators.isNull,
          equalTo: standardOperators.equalTo,
          notEqualTo: standardOperators.notEqualTo,
          distinctFrom: standardOperators.distinctFrom,
          notDistinctFrom: standardOperators.notDistinctFrom,
          ...sortOperators,
          contains: {
            description: 'Contains the specified list of values.',
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolveInputCodec: resolveInputCodecSensitive,
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} @> ${v}`, [sql]),
          },
          containedBy: {
            description: 'Contained by the specified list of values.',
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolveInputCodec: resolveInputCodecSensitive,
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} <@ ${v}`, [sql]),
          },
          overlaps: {
            description: 'Overlaps the specified list of values.',
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolveInputCodec: resolveInputCodecSensitive,
            resolve: EXPORTABLE((sql) => (i, v) => sql`${i} && ${v}`, [sql]),
          },
          anyEqualTo: {
            description: 'Any array item is equal to the specified value.',
            resolveInputCodec: resolveArrayItemInputCodecSensitive,
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${v} = ANY (${i})`,
              [sql]
            ),
          },
          anyNotEqualTo: {
            description: 'Any array item is not equal to the specified value.',
            resolveInputCodec: resolveArrayItemInputCodecSensitive,
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${v} <> ANY (${i})`,
              [sql]
            ),
          },
          anyLessThan: {
            description: 'Any array item is less than the specified value.',
            resolveInputCodec: resolveArrayItemInputCodecSensitive,
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${v} > ANY (${i})`,
              [sql]
            ),
          },
          anyLessThanOrEqualTo: {
            description:
              'Any array item is less than or equal to the specified value.',
            resolveInputCodec: resolveArrayItemInputCodecSensitive,
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${v} >= ANY (${i})`,
              [sql]
            ),
          },
          anyGreaterThan: {
            description: 'Any array item is greater than the specified value.',
            resolveInputCodec: resolveArrayItemInputCodecSensitive,
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${v} < ANY (${i})`,
              [sql]
            ),
          },
          anyGreaterThanOrEqualTo: {
            description:
              'Any array item is greater than or equal to the specified value.',
            resolveInputCodec: resolveArrayItemInputCodecSensitive,
            resolve: EXPORTABLE(
              (sql) => (i, v) => sql`${v} <= ANY (${i})`,
              [sql]
            ),
          },
        };

        // =========================================================================
        // Determine applicable operators based on codec type
        // =========================================================================

        const { pgCodecs } = pgConnectionFilterOperators;

        // Get the GraphQL input type from the first codec
        const someCodec = pgCodecs[0];
        const fieldInputType = build.getGraphQLTypeByPgCodec(someCodec, 'input');
        const rangeElementInputType = someCodec.rangeOfCodec
          ? build.getGraphQLTypeByPgCodec(someCodec.rangeOfCodec, 'input')
          : null;

        // Determine type characteristics from all codecs
        let textLike = true;
        let sortable = true;
        let inetLike = true;
        let jsonLike = true;
        let hstoreLike = true;
        let arrayLike = true;
        let rangeLike = true;
        let enumLike = true;

        for (const codec of pgCodecs) {
          const underlyingType = codec.domainOfCodec ?? codec;

          if (!underlyingType.arrayOfCodec) {
            arrayLike = false;
          }
          if (!underlyingType.rangeOfCodec) {
            rangeLike = false;
          }
          if (!isEnumCodec(underlyingType)) {
            enumLike = false;
          }

          // Check sortability
          switch (underlyingType) {
            case TYPES.numeric:
            case TYPES.money:
            case TYPES.float:
            case TYPES.float4:
            case TYPES.bigint:
            case TYPES.int:
            case TYPES.int2:
            case TYPES.boolean:
            case TYPES.varbit:
            case TYPES.bit:
            case TYPES.date:
            case TYPES.timestamp:
            case TYPES.timestamptz:
            case TYPES.time:
            case TYPES.timetz:
            case TYPES.interval:
            case TYPES.json:
            case TYPES.jsonb:
            case TYPES.cidr:
            case TYPES.inet:
            case TYPES.macaddr:
            case TYPES.macaddr8:
            case TYPES.text:
            case TYPES.name:
            case TYPES.citext:
            case TYPES.varchar:
            case TYPES.char:
            case TYPES.bpchar:
            case TYPES.uuid:
              // Sortable
              break;
            default:
              sortable = false;
          }

          // Check inet-like
          switch (underlyingType) {
            case TYPES.cidr:
            case TYPES.inet:
            case TYPES.macaddr:
            case TYPES.macaddr8:
              // Inet-like
              break;
            default:
              inetLike = false;
          }

          // Check text-like
          switch (underlyingType) {
            case TYPES.text:
            case TYPES.name:
            case TYPES.citext:
            case TYPES.varchar:
            case TYPES.char:
            case TYPES.bpchar:
              // Text-like
              break;
            default:
              textLike = false;
          }

          // Check JSON-like
          switch (underlyingType) {
            case TYPES.json:
            case TYPES.jsonb:
              // JSON-like
              break;
            default:
              jsonLike = false;
          }

          // Check HStore-like
          switch (underlyingType) {
            case TYPES.hstore:
              // HStore-like
              break;
            default:
              hstoreLike = false;
          }
        }

        // Select the appropriate operator set
        const operatorSpecs: { [fieldName: string]: OperatorSpec } = arrayLike
          ? connectionFilterArrayOperators
          : rangeLike
            ? connectionFilterRangeOperators
            : enumLike
              ? connectionFilterEnumOperators
              : {
                  ...standardOperators,
                  ...(sortable ? sortOperators : null),
                  ...(inetLike ? inetOperators : null),
                  ...(jsonLike ? jsonbOperators : null),
                  ...(hstoreLike ? hstoreOperators : null),
                  ...(textLike ? patternMatchingOperators : null),
                  ...(textLike ? insensitiveOperators : null),
                };

        // =========================================================================
        // Build operator fields
        // =========================================================================

        const operatorFields = Object.entries(operatorSpecs).reduce(
          (memo: { [fieldName: string]: any }, [name, spec]) => {
            const { description, resolveInputCodec, resolveType } = spec;

            // Check if operator is allowed
            if (
              connectionFilterAllowedOperators &&
              !connectionFilterAllowedOperators.includes(name)
            ) {
              return memo;
            }

            if (!fieldInputType) {
              return memo;
            }

            // Determine input codec and GraphQL type
            const firstCodec = pgCodecs[0];
            const inputCodec = resolveInputCodec
              ? resolveInputCodec(firstCodec)
              : firstCodec;
            const codecGraphQLType = build.getGraphQLTypeByPgCodec(
              inputCodec,
              'input'
            );

            if (!codecGraphQLType) {
              return memo;
            }

            const type = resolveType
              ? resolveType(codecGraphQLType)
              : codecGraphQLType;

            // Apply custom operator name if configured
            const operatorName =
              (connectionFilterOperatorNames &&
                connectionFilterOperatorNames[name]) ||
              name;

            memo[operatorName] = fieldWithHooks(
              {
                fieldName: operatorName,
                isPgConnectionFilterOperator: true,
              },
              {
                description,
                type,
                apply: makeApplyFromOperatorSpec(
                  build,
                  Self.name,
                  operatorName,
                  spec,
                  type
                ),
              }
            );

            return memo;
          },
          Object.create(null)
        );

        return extend(fields, operatorFields, '');
      },
    },
  },
};

export default PgConnectionArgFilterOperatorsPlugin;
