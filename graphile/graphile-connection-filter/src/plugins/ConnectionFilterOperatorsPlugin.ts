import '../augmentations';
import type { GraphileConfig } from 'graphile-config';
import { makeApplyFromOperatorSpec } from './operatorApply';

const version = '1.0.0';

/**
 * ConnectionFilterOperatorsPlugin
 *
 * Registers all built-in filter operators on the per-scalar operator types
 * (e.g. StringFilter, IntFilter, DatetimeFilter, etc.).
 *
 * Operator categories:
 * - Standard: isNull, equalTo, notEqualTo, distinctFrom, notDistinctFrom, in, notIn
 * - Sort: lessThan, lessThanOrEqualTo, greaterThan, greaterThanOrEqualTo
 * - Pattern matching (text-like): includes, startsWith, endsWith, like + insensitive variants
 * - Hstore: contains, containsKey, containsAllKeys, containsAnyKeys, containedBy
 * - JSONB: contains, containsKey, containsAllKeys, containsAnyKeys, containedBy
 * - Inet: contains, containsOrEqualTo, containedBy, containedByOrEqualTo, containsOrContainedBy
 * - Array: contains, containedBy, overlaps, anyEqualTo, anyNotEqualTo, any comparison operators
 * - Range: contains, containsElement, containedBy, overlaps, strictlyLeftOf, strictlyRightOf, etc.
 * - Enum: standard + sort operators
 * - Case-insensitive variants of standard and sort operators
 */
export const ConnectionFilterOperatorsPlugin: GraphileConfig.Plugin = {
  name: 'ConnectionFilterOperatorsPlugin',
  version,
  description: 'Registers built-in filter operators for all scalar types',

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

        if (!pgConnectionFilterOperators) {
          return fields;
        }

        // --- Helper functions for type resolution ---

        /** Turn `[Foo]` into `[Foo!]` */
        const resolveTypeToListOfNonNullable = EXPORTABLE(
          (GraphQLList: any, GraphQLNonNull: any, isListType: any, isNonNullType: any) =>
            function (type: any) {
              if (isListType(type) && !isNonNullType(type.ofType)) {
                return new GraphQLList(new GraphQLNonNull(type.ofType));
              }
              return type;
            },
          [GraphQLList, GraphQLNonNull, isListType, isNonNullType]
        );

        // Types that need casting to text for case-sensitive comparisons
        const forceTextTypesSensitive = [TYPES.citext, TYPES.char, TYPES.bpchar];
        const forceTextTypesInsensitive = [TYPES.char, TYPES.bpchar];

        const resolveDomains = EXPORTABLE(
          () =>
            function (c: any): any {
              let current = c;
              while (current.domainOfCodec) {
                current = current.domainOfCodec;
              }
              return current;
            },
          []
        );

        // --- Codec resolution helpers for sensitive/insensitive comparisons ---

        const resolveArrayInputCodecSensitive = EXPORTABLE(
          (TYPES: any, forceTextTypesSensitive: any, listOfCodec: any, resolveDomains: any) =>
            function (c: any) {
              if (forceTextTypesSensitive.includes(resolveDomains(c))) {
                return listOfCodec(TYPES.text, { extensions: { listItemNonNull: true } });
              }
              return listOfCodec(c, { extensions: { listItemNonNull: true } });
            },
          [TYPES, forceTextTypesSensitive, listOfCodec, resolveDomains]
        );

        const resolveArrayItemInputCodecSensitive = EXPORTABLE(
          (TYPES: any, forceTextTypesSensitive: any, resolveDomains: any) =>
            function (c: any) {
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

        const resolveInputCodecSensitive = EXPORTABLE(
          (TYPES: any, forceTextTypesSensitive: any, listOfCodec: any, resolveDomains: any) =>
            function (c: any) {
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

        const resolveSqlIdentifierSensitive = EXPORTABLE(
          (TYPES: any, forceTextTypesSensitive: any, listOfCodec: any, resolveDomains: any, sql: any) =>
            function (identifier: any, c: any): [any, any] {
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
              } else if (forceTextTypesSensitive.includes(resolveDomains(c))) {
                return [sql`(${identifier})::text`, TYPES.text];
              }
              return [identifier, c];
            },
          [TYPES, forceTextTypesSensitive, listOfCodec, resolveDomains, sql]
        );

        const resolveInputCodecInsensitive = EXPORTABLE(
          (TYPES: any, forceTextTypesInsensitive: any, listOfCodec: any, resolveDomains: any) =>
            function (c: any) {
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

        const resolveSqlIdentifierInsensitive = EXPORTABLE(
          (TYPES: any, forceTextTypesInsensitive: any, listOfCodec: any, resolveDomains: any, sql: any) =>
            function (identifier: any, c: any): [any, any] {
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
              } else if (forceTextTypesInsensitive.includes(resolveDomains(c))) {
                return [sql`(${identifier})::text`, TYPES.text];
              }
              return [identifier, c];
            },
          [TYPES, forceTextTypesInsensitive, listOfCodec, resolveDomains, sql]
        );

        // --- Operator definitions ---

        const standardOperators: Record<string, any> = {
          isNull: {
            description:
              'Is null (if `true` is specified) or is not null (if `false` is specified).',
            resolveInputCodec: EXPORTABLE((TYPES: any) => () => TYPES.boolean, [TYPES]),
            resolveSqlValue: EXPORTABLE((sql: any) => () => sql.null, [sql]),
            resolve: EXPORTABLE(
              (sql: any) => (i: any, _v: any, input: any) =>
                sql`${i} ${input ? sql`IS NULL` : sql`IS NOT NULL`}`,
              [sql]
            ),
          },
          equalTo: {
            description: 'Equal to the specified value.',
            resolve: EXPORTABLE((sql: any) => (i: any, v: any) => sql`${i} = ${v}`, [sql]),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
          notEqualTo: {
            description: 'Not equal to the specified value.',
            resolve: EXPORTABLE((sql: any) => (i: any, v: any) => sql`${i} <> ${v}`, [sql]),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
          distinctFrom: {
            description:
              'Not equal to the specified value, treating null like an ordinary value.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} IS DISTINCT FROM ${v}`,
              [sql]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
          notDistinctFrom: {
            description:
              'Equal to the specified value, treating null like an ordinary value.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} IS NOT DISTINCT FROM ${v}`,
              [sql]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
          in: {
            description: 'Included in the specified list.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} = ANY(${v})`,
              [sql]
            ),
            resolveInputCodec: resolveArrayInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolveType: resolveTypeToListOfNonNullable,
          },
          notIn: {
            description: 'Not included in the specified list.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} <> ALL(${v})`,
              [sql]
            ),
            resolveInputCodec: resolveArrayInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolveType: resolveTypeToListOfNonNullable,
          },
        };

        const sortOperators: Record<string, any> = {
          lessThan: {
            description: 'Less than the specified value.',
            resolve: EXPORTABLE((sql: any) => (i: any, v: any) => sql`${i} < ${v}`, [sql]),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
          lessThanOrEqualTo: {
            description: 'Less than or equal to the specified value.',
            resolve: EXPORTABLE((sql: any) => (i: any, v: any) => sql`${i} <= ${v}`, [sql]),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
          greaterThan: {
            description: 'Greater than the specified value.',
            resolve: EXPORTABLE((sql: any) => (i: any, v: any) => sql`${i} > ${v}`, [sql]),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
          greaterThanOrEqualTo: {
            description: 'Greater than or equal to the specified value.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} >= ${v}`,
              [sql]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
        };

        const patternMatchingOperators: Record<string, any> = {
          includes: {
            description: 'Contains the specified string (case-sensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards: any) => (input: any) =>
                `%${escapeLikeWildcards(input)}%`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolve: EXPORTABLE((sql: any) => (i: any, v: any) => sql`${i} LIKE ${v}`, [sql]),
          },
          notIncludes: {
            description: 'Does not contain the specified string (case-sensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards: any) => (input: any) =>
                `%${escapeLikeWildcards(input)}%`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} NOT LIKE ${v}`,
              [sql]
            ),
          },
          includesInsensitive: {
            description: 'Contains the specified string (case-insensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards: any) => (input: any) =>
                `%${escapeLikeWildcards(input)}%`,
              [escapeLikeWildcards]
            ),
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} ILIKE ${v}`,
              [sql]
            ),
            resolveInputCodec: resolveInputCodecInsensitive,
            resolveSqlIdentifier: resolveSqlIdentifierInsensitive,
          },
          notIncludesInsensitive: {
            description: 'Does not contain the specified string (case-insensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards: any) => (input: any) =>
                `%${escapeLikeWildcards(input)}%`,
              [escapeLikeWildcards]
            ),
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} NOT ILIKE ${v}`,
              [sql]
            ),
            resolveInputCodec: resolveInputCodecInsensitive,
            resolveSqlIdentifier: resolveSqlIdentifierInsensitive,
          },
          startsWith: {
            description: 'Starts with the specified string (case-sensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards: any) => (input: any) =>
                `${escapeLikeWildcards(input)}%`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolve: EXPORTABLE((sql: any) => (i: any, v: any) => sql`${i} LIKE ${v}`, [sql]),
          },
          notStartsWith: {
            description: 'Does not start with the specified string (case-sensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards: any) => (input: any) =>
                `${escapeLikeWildcards(input)}%`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} NOT LIKE ${v}`,
              [sql]
            ),
          },
          startsWithInsensitive: {
            description: 'Starts with the specified string (case-insensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards: any) => (input: any) =>
                `${escapeLikeWildcards(input)}%`,
              [escapeLikeWildcards]
            ),
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} ILIKE ${v}`,
              [sql]
            ),
            resolveInputCodec: resolveInputCodecInsensitive,
            resolveSqlIdentifier: resolveSqlIdentifierInsensitive,
          },
          notStartsWithInsensitive: {
            description: 'Does not start with the specified string (case-insensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards: any) => (input: any) =>
                `${escapeLikeWildcards(input)}%`,
              [escapeLikeWildcards]
            ),
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} NOT ILIKE ${v}`,
              [sql]
            ),
            resolveInputCodec: resolveInputCodecInsensitive,
            resolveSqlIdentifier: resolveSqlIdentifierInsensitive,
          },
          endsWith: {
            description: 'Ends with the specified string (case-sensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards: any) => (input: any) =>
                `%${escapeLikeWildcards(input)}`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolve: EXPORTABLE((sql: any) => (i: any, v: any) => sql`${i} LIKE ${v}`, [sql]),
          },
          notEndsWith: {
            description: 'Does not end with the specified string (case-sensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards: any) => (input: any) =>
                `%${escapeLikeWildcards(input)}`,
              [escapeLikeWildcards]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} NOT LIKE ${v}`,
              [sql]
            ),
          },
          endsWithInsensitive: {
            description: 'Ends with the specified string (case-insensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards: any) => (input: any) =>
                `%${escapeLikeWildcards(input)}`,
              [escapeLikeWildcards]
            ),
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} ILIKE ${v}`,
              [sql]
            ),
            resolveInputCodec: resolveInputCodecInsensitive,
            resolveSqlIdentifier: resolveSqlIdentifierInsensitive,
          },
          notEndsWithInsensitive: {
            description: 'Does not end with the specified string (case-insensitive).',
            resolveInput: EXPORTABLE(
              (escapeLikeWildcards: any) => (input: any) =>
                `%${escapeLikeWildcards(input)}`,
              [escapeLikeWildcards]
            ),
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} NOT ILIKE ${v}`,
              [sql]
            ),
            resolveInputCodec: resolveInputCodecInsensitive,
            resolveSqlIdentifier: resolveSqlIdentifierInsensitive,
          },
          like: {
            description:
              'Matches the specified pattern (case-sensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters.',
            resolve: EXPORTABLE((sql: any) => (i: any, v: any) => sql`${i} LIKE ${v}`, [sql]),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
          notLike: {
            description:
              'Does not match the specified pattern (case-sensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} NOT LIKE ${v}`,
              [sql]
            ),
            resolveInputCodec: resolveInputCodecSensitive,
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
          },
          likeInsensitive: {
            description:
              'Matches the specified pattern (case-insensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} ILIKE ${v}`,
              [sql]
            ),
            resolveInputCodec: resolveInputCodecInsensitive,
            resolveSqlIdentifier: resolveSqlIdentifierInsensitive,
          },
          notLikeInsensitive: {
            description:
              'Does not match the specified pattern (case-insensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} NOT ILIKE ${v}`,
              [sql]
            ),
            resolveInputCodec: resolveInputCodecInsensitive,
            resolveSqlIdentifier: resolveSqlIdentifierInsensitive,
          },
        };

        const resolveTextArrayInputCodec = EXPORTABLE(
          (TYPES: any, listOfCodec: any) => () =>
            listOfCodec(TYPES.text, { extensions: { listItemNonNull: true } }),
          [TYPES, listOfCodec]
        );

        const hstoreOperators: Record<string, any> = {
          contains: {
            description: 'Contains the specified KeyValueHash.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} @> ${v}`,
              [sql]
            ),
          },
          containsKey: {
            description: 'Contains the specified key.',
            resolveInputCodec: EXPORTABLE((TYPES: any) => () => TYPES.text, [TYPES]),
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} ? ${v}`,
              [sql]
            ),
          },
          containsAllKeys: {
            description: 'Contains all of the specified keys.',
            resolveInputCodec: resolveTextArrayInputCodec,
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} ?& ${v}`,
              [sql]
            ),
            resolveType: resolveTypeToListOfNonNullable,
          },
          containsAnyKeys: {
            description: 'Contains any of the specified keys.',
            resolveInputCodec: resolveTextArrayInputCodec,
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} ?| ${v}`,
              [sql]
            ),
            resolveType: resolveTypeToListOfNonNullable,
          },
          containedBy: {
            description: 'Contained by the specified KeyValueHash.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} <@ ${v}`,
              [sql]
            ),
          },
        };

        const jsonbOperators: Record<string, any> = {
          contains: {
            description: 'Contains the specified JSON.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} @> ${v}`,
              [sql]
            ),
          },
          containsKey: {
            description: 'Contains the specified key.',
            resolveInputCodec: EXPORTABLE((TYPES: any) => () => TYPES.text, [TYPES]),
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} ? ${v}`,
              [sql]
            ),
          },
          containsAllKeys: {
            description: 'Contains all of the specified keys.',
            resolveInputCodec: resolveTextArrayInputCodec,
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} ?& ${v}`,
              [sql]
            ),
          },
          containsAnyKeys: {
            description: 'Contains any of the specified keys.',
            resolveInputCodec: resolveTextArrayInputCodec,
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} ?| ${v}`,
              [sql]
            ),
          },
          containedBy: {
            description: 'Contained by the specified JSON.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} <@ ${v}`,
              [sql]
            ),
          },
        };

        const inetOperators: Record<string, any> = {
          contains: {
            description: 'Contains the specified internet address.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} >> ${v}`,
              [sql]
            ),
          },
          containsOrEqualTo: {
            description: 'Contains or equal to the specified internet address.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} >>= ${v}`,
              [sql]
            ),
          },
          containedBy: {
            description: 'Contained by the specified internet address.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} << ${v}`,
              [sql]
            ),
          },
          containedByOrEqualTo: {
            description: 'Contained by or equal to the specified internet address.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} <<= ${v}`,
              [sql]
            ),
          },
          containsOrContainedBy: {
            description: 'Contains or contained by the specified internet address.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} && ${v}`,
              [sql]
            ),
          },
        };

        // --- Case-insensitive variants of standard + sort operators ---
        const insensitiveOperators: Record<string, any> = {};
        for (const [name, spec] of [
          ...Object.entries(standardOperators),
          ...Object.entries(sortOperators),
        ]) {
          if (name === 'isNull') continue;

          const description = `${spec.description.substring(0, spec.description.length - 1)} (case-insensitive).`;

          const resolveSqlIdentifier = EXPORTABLE(
            (TYPES: any, resolveDomains: any, sql: any) =>
              function (sourceAlias: any, codec: any): [any, any] {
                return resolveDomains(codec) === TYPES.citext
                  ? [sourceAlias, codec]
                  : [sql`lower(${sourceAlias}::text)`, TYPES.text];
              },
            [TYPES, resolveDomains, sql]
          );

          const resolveSqlValue = EXPORTABLE(
            (TYPES: any, name: string, sql: any, sqlValueWithCodec: any) =>
              function (_unused: any, input: any, inputCodec: any) {
                if (name === 'in' || name === 'notIn') {
                  const sqlList = sqlValueWithCodec(input, inputCodec);
                  if (inputCodec.arrayOfCodec === TYPES.citext) {
                    return sqlList;
                  }
                  return sql`(select lower(t) from unnest(${sqlList}) t)`;
                }
                const sqlValue = sqlValueWithCodec(input, inputCodec);
                if (inputCodec === TYPES.citext) {
                  return sqlValue;
                }
                return sql`lower(${sqlValue})`;
              },
            [TYPES, name, sql, sqlValueWithCodec]
          );

          const resolveInputCodec = EXPORTABLE(
            (TYPES: any, listOfCodec: any, name: string, resolveDomains: any) =>
              function (inputCodec: any) {
                if (name === 'in' || name === 'notIn') {
                  const t =
                    resolveDomains(inputCodec) === TYPES.citext
                      ? inputCodec
                      : TYPES.text;
                  return listOfCodec(t, { extensions: { listItemNonNull: true } });
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
            resolveInputCodec: resolveInputCodec,
            resolveSqlIdentifier: resolveSqlIdentifier,
            resolveSqlValue: resolveSqlValue,
          };
        }

        // --- Composite operator sets for specific type categories ---

        const connectionFilterEnumOperators = {
          ...standardOperators,
          ...sortOperators,
        };

        const connectionFilterRangeOperators: Record<string, any> = {
          ...standardOperators,
          ...sortOperators,
          contains: {
            description: 'Contains the specified range.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} @> ${v}`,
              [sql]
            ),
          },
          containsElement: {
            description: 'Contains the specified value.',
            resolveInputCodec: EXPORTABLE(
              () =>
                function (c: any) {
                  if (c.rangeOfCodec) return c.rangeOfCodec;
                  throw new Error(
                    "Couldn't determine the range element type to use"
                  );
                },
              []
            ),
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} @> ${v}`,
              [sql]
            ),
          },
          containedBy: {
            description: 'Contained by the specified range.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} <@ ${v}`,
              [sql]
            ),
          },
          overlaps: {
            description: 'Overlaps the specified range.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} && ${v}`,
              [sql]
            ),
          },
          strictlyLeftOf: {
            description: 'Strictly left of the specified range.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} << ${v}`,
              [sql]
            ),
          },
          strictlyRightOf: {
            description: 'Strictly right of the specified range.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} >> ${v}`,
              [sql]
            ),
          },
          notExtendsRightOf: {
            description: 'Does not extend right of the specified range.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} &< ${v}`,
              [sql]
            ),
          },
          notExtendsLeftOf: {
            description: 'Does not extend left of the specified range.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} &> ${v}`,
              [sql]
            ),
          },
          adjacentTo: {
            description: 'Adjacent to the specified range.',
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} -|- ${v}`,
              [sql]
            ),
          },
        };

        const connectionFilterArrayOperators: Record<string, any> = {
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
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} @> ${v}`,
              [sql]
            ),
          },
          containedBy: {
            description: 'Contained by the specified list of values.',
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolveInputCodec: resolveInputCodecSensitive,
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} <@ ${v}`,
              [sql]
            ),
          },
          overlaps: {
            description: 'Overlaps the specified list of values.',
            resolveSqlIdentifier: resolveSqlIdentifierSensitive,
            resolveInputCodec: resolveInputCodecSensitive,
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${i} && ${v}`,
              [sql]
            ),
          },
          anyEqualTo: {
            description: 'Any array item is equal to the specified value.',
            resolveInputCodec: resolveArrayItemInputCodecSensitive,
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${v} = ANY (${i})`,
              [sql]
            ),
          },
          anyNotEqualTo: {
            description: 'Any array item is not equal to the specified value.',
            resolveInputCodec: resolveArrayItemInputCodecSensitive,
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${v} <> ANY (${i})`,
              [sql]
            ),
          },
          anyLessThan: {
            description: 'Any array item is less than the specified value.',
            resolveInputCodec: resolveArrayItemInputCodecSensitive,
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${v} > ANY (${i})`,
              [sql]
            ),
          },
          anyLessThanOrEqualTo: {
            description: 'Any array item is less than or equal to the specified value.',
            resolveInputCodec: resolveArrayItemInputCodecSensitive,
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${v} >= ANY (${i})`,
              [sql]
            ),
          },
          anyGreaterThan: {
            description: 'Any array item is greater than the specified value.',
            resolveInputCodec: resolveArrayItemInputCodecSensitive,
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${v} < ANY (${i})`,
              [sql]
            ),
          },
          anyGreaterThanOrEqualTo: {
            description: 'Any array item is greater than or equal to the specified value.',
            resolveInputCodec: resolveArrayItemInputCodecSensitive,
            resolve: EXPORTABLE(
              (sql: any) => (i: any, v: any) => sql`${v} <= ANY (${i})`,
              [sql]
            ),
          },
        };

        // --- Determine which operators to use based on codec characteristics ---

        const { pgCodecs } = pgConnectionFilterOperators;
        const someCodec = pgCodecs[0];
        const fieldInputType = build.getGraphQLTypeByPgCodec(someCodec, 'input');

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
          if (!underlyingType.arrayOfCodec) arrayLike = false;
          if (!underlyingType.rangeOfCodec) rangeLike = false;
          if (!isEnumCodec(underlyingType)) enumLike = false;

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
              break;
            default:
              sortable = false;
          }

          switch (underlyingType) {
            case TYPES.cidr:
            case TYPES.inet:
            case TYPES.macaddr:
            case TYPES.macaddr8:
              break;
            default:
              inetLike = false;
          }

          switch (underlyingType) {
            case TYPES.text:
            case TYPES.name:
            case TYPES.citext:
            case TYPES.varchar:
            case TYPES.char:
            case TYPES.bpchar:
              break;
            default:
              textLike = false;
          }

          switch (underlyingType) {
            case TYPES.json:
            case TYPES.jsonb:
              break;
            default:
              jsonLike = false;
          }

          switch (underlyingType) {
            case TYPES.hstore:
              break;
            default:
              hstoreLike = false;
          }
        }

        // Choose the correct operator set
        const operatorSpecs: Record<string, any> = arrayLike
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

        // Build the operator fields
        const operatorFields = Object.entries(operatorSpecs).reduce(
          (memo: Record<string, any>, [name, spec]) => {
            const { description, resolveInputCodec, resolveType } = spec;

            if (
              connectionFilterAllowedOperators &&
              !connectionFilterAllowedOperators.includes(name)
            ) {
              return memo;
            }

            if (!fieldInputType) return memo;

            const firstCodec = pgCodecs[0];
            const inputCodec = resolveInputCodec
              ? resolveInputCodec(firstCodec)
              : firstCodec;

            const codecGraphQLType = build.getGraphQLTypeByPgCodec(
              inputCodec,
              'input'
            );
            if (!codecGraphQLType) return memo;

            const type = resolveType
              ? resolveType(codecGraphQLType)
              : codecGraphQLType;

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
