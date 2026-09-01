/**
 * Document gate — depth, cost, page size and introspection limits.
 *
 * A statement timeout stops a slow query; it does not stop a cheap-looking one
 * that asks for a million rows across nested connections, because that request
 * spends its budget in output size and memory rather than in a single statement.
 * These bounds are therefore checked against the *document*, before any plan is
 * executed.
 *
 * Cost is measured as the number of rows the operation can pull: a connection
 * contributes its page size multiplied by the page sizes of every connection
 * above it, so `users(first: 100) { posts(first: 100) }` costs 100 + 10,000
 * rather than the 4 fields it looks like. A connection with no `first`/`last`
 * is charged `ASSUMED_PAGE_SIZE`, since it is unbounded in principle.
 *
 * The walk is manual rather than `visitWithTypeInfo` because fragment spreads
 * have to be followed (a document can hide its depth entirely inside
 * fragments) and the visitor does not follow them.
 */

import type { ConstructiveError } from '@constructive-io/errors';
import { errors } from '@constructive-io/errors';
import { ASSUMED_PAGE_SIZE, type RequestProtection } from '@constructive-io/express-context';
import { SafeError } from 'grafast';
import type {
  DocumentNode,
  FragmentDefinitionNode,
  GraphQLNamedType,
  GraphQLSchema,
  OperationDefinitionNode,
  SelectionSetNode
} from 'graphql';
import { getNamedType, isObjectType, Kind, typeFromAST } from 'graphql';

/**
 * Reject the request with an error the client can act on.
 *
 * The gate runs inside grafast's `prepareArgs`, before execution, where a
 * plain throw is reported as an unknown handler failure: HTTP 500 with the
 * `extensions` dropped. `SafeError` is grafserv's contract for "this message
 * and these extensions are meant for the client", so the registered code,
 * class and HTTP status survive the trip.
 */
const reject = (error: ConstructiveError): never => {
  throw new SafeError(error.message, {
    ...error.toExtensions(),
    statusCode: error.http
  });
};

/** Arguments a connection field uses to size its page. */
const PAGE_SIZE_ARGS = ['first', 'last'] as const;

/** A connection is any object type that carries Relay's `pageInfo`. */
const isConnectionType = (type: GraphQLNamedType | null | undefined): boolean =>
  Boolean(type && isObjectType(type) && 'pageInfo' in type.getFields());

interface Walk {
  schema: GraphQLSchema;
  fragments: Record<string, FragmentDefinitionNode>;
  variableValues: Record<string, unknown>;
  protection: RequestProtection;
  /** Fragment names on the current path, so a cyclic document cannot hang the walk. */
  activeFragments: Set<string>;
  maxDepth: number;
  cost: number;
}

/**
 * Resolve a `first`/`last` argument to a number, whether it arrived as a
 * literal or through a variable. Returns null when the field does not page.
 */
const requestedPageSize = (
  args: readonly { readonly name: { readonly value: string }; readonly value: unknown }[] | undefined,
  variableValues: Record<string, unknown>
): number | null => {
  if (!args) return null;
  let size: number | null = null;
  for (const arg of args) {
    if (!(PAGE_SIZE_ARGS as readonly string[]).includes(arg.name.value)) continue;
    const value = arg.value as { kind: string; value?: string; name?: { value: string } };
    const resolved =
      value.kind === Kind.INT
        ? Number(value.value)
        : value.kind === Kind.VARIABLE
          ? Number(variableValues[value.name!.value])
          : null;
    if (resolved !== null && Number.isFinite(resolved)) {
      size = size === null ? resolved : Math.max(size, resolved);
    }
  }
  return size;
};

/**
 * Walk one selection set, accumulating depth and cost.
 *
 * @param parentType - the type the selections are read from, or null when the
 *   schema cannot resolve it (an invalid document; validation reports that, so
 *   the walk only stops charging cost rather than raising its own error)
 * @param depth - nesting level of these selections
 * @param multiplier - rows the enclosing connections can return
 */
function walkSelectionSet(
  walk: Walk,
  selectionSet: SelectionSetNode,
  parentType: GraphQLNamedType | null,
  depth: number,
  multiplier: number
): void {
  if (depth > walk.maxDepth) walk.maxDepth = depth;
  if (depth > walk.protection.maxQueryDepth) {
    reject(errors.QUERY_TOO_DEEP({ depth, limit: walk.protection.maxQueryDepth }));
  }

  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      if (selection.name.value === '__schema' || selection.name.value === '__type') {
        if (!walk.protection.enableIntrospection) {
          reject(errors.INTROSPECTION_DISABLED());
        }
      }

      const field =
        parentType && isObjectType(parentType)
          ? parentType.getFields()[selection.name.value]
          : undefined;
      const fieldType = field ? getNamedType(field.type) : null;

      const pageSize = requestedPageSize(selection.arguments, walk.variableValues);
      if (pageSize !== null && pageSize > walk.protection.maxPageSize) {
        reject(
          errors.PAGE_SIZE_TOO_LARGE({
            requested: pageSize,
            limit: walk.protection.maxPageSize
          })
        );
      }

      // A connection charges rows; every other field is free, so a wide but
      // flat selection is not penalized for being wide.
      let childMultiplier = multiplier;
      if (isConnectionType(fieldType)) {
        childMultiplier = multiplier * (pageSize ?? ASSUMED_PAGE_SIZE);
        walk.cost += childMultiplier;
        if (walk.cost > walk.protection.maxQueryCost) {
          reject(
            errors.QUERY_TOO_COSTLY({
              cost: walk.cost,
              limit: walk.protection.maxQueryCost
            })
          );
        }
      }

      if (selection.selectionSet) {
        walkSelectionSet(walk, selection.selectionSet, fieldType, depth + 1, childMultiplier);
      }
      continue;
    }

    if (selection.kind === Kind.INLINE_FRAGMENT) {
      const onType = selection.typeCondition
        ? (typeFromAST(walk.schema, selection.typeCondition) as GraphQLNamedType | undefined)
        : parentType;
      // An inline fragment is not a level of nesting of its own.
      walkSelectionSet(walk, selection.selectionSet, onType ?? null, depth, multiplier);
      continue;
    }

    if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const name = selection.name.value;
      // A document may spread the same fragment in sibling positions; only a
      // cycle (a fragment reachable from itself) is refused, and the GraphQL
      // validation rules already reject those with a proper error.
      if (walk.activeFragments.has(name)) continue;
      const fragment = walk.fragments[name];
      if (!fragment) continue;

      const onType = typeFromAST(walk.schema, fragment.typeCondition) as
        | GraphQLNamedType
        | undefined;
      walk.activeFragments.add(name);
      try {
        walkSelectionSet(walk, fragment.selectionSet, onType ?? null, depth, multiplier);
      } finally {
        walk.activeFragments.delete(name);
      }
    }
  }
}

export interface DocumentAnalysis {
  /** Deepest field nesting in the operation. */
  depth: number;
  /** Rows the operation can pull across all of its connections. */
  cost: number;
}

/**
 * Enforce the document-level bounds for one operation.
 *
 * Throws the matching public error on the first bound exceeded; returns what it
 * measured otherwise, so a caller can log or expose it.
 */
export function enforceDocumentProtection(
  schema: GraphQLSchema,
  document: DocumentNode,
  variableValues: Record<string, unknown> | null | undefined,
  protection: RequestProtection,
  operationName?: string | null
): DocumentAnalysis {
  const fragments: Record<string, FragmentDefinitionNode> = {};
  const operations: OperationDefinitionNode[] = [];
  for (const definition of document.definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) fragments[definition.name.value] = definition;
    else if (definition.kind === Kind.OPERATION_DEFINITION) operations.push(definition);
  }

  const operation = operationName
    ? operations.find((op) => op.name?.value === operationName)
    : operations[0];
  if (!operation) return { depth: 0, cost: 0 };

  const rootType =
    operation.operation === 'query'
      ? schema.getQueryType()
      : operation.operation === 'mutation'
        ? schema.getMutationType()
        : schema.getSubscriptionType();

  const walk: Walk = {
    schema,
    fragments,
    variableValues: variableValues ?? {},
    protection,
    activeFragments: new Set(),
    maxDepth: 0,
    cost: 0
  };

  walkSelectionSet(walk, operation.selectionSet, rootType ?? null, 1, 1);

  return { depth: walk.maxDepth, cost: walk.cost };
}
