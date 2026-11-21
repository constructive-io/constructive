import { type DocumentNode, getDirectiveValues, getOperationAST, GraphQLIncludeDirective, GraphQLSkipDirective, Kind, type SelectionSetNode, valueFromASTUntyped } from 'graphql';

import { filterMapIterator } from './async-iterator';

export function realtimeResponseNames(document: DocumentNode, operationName: string | null | undefined, fields: ReadonlySet<string>, variableValues: Record<string, unknown> = {}): string[] {
  const operation = getOperationAST(document, operationName);
  if (operation?.operation !== 'subscription') return [];
  const variables = Object.fromEntries((operation.variableDefinitions ?? [])
    .filter(definition => definition.defaultValue)
    .map(definition => [definition.variable.name.value, valueFromASTUntyped(definition.defaultValue!)]));
  Object.assign(variables, variableValues);
  const names = new Set<string>();
  const visited = new Set<string>();
  function visit(selectionSet: SelectionSetNode) {
    for (const selection of selectionSet.selections) {
      if (getDirectiveValues(GraphQLSkipDirective, selection, variables)?.if === true ||
        getDirectiveValues(GraphQLIncludeDirective, selection, variables)?.if === false) continue;
      if (selection.kind === Kind.FIELD) {
        if (fields.has(selection.name.value)) names.add(selection.alias?.value ?? selection.name.value);
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        visit(selection.selectionSet);
      } else if (!visited.has(selection.name.value)) {
        visited.add(selection.name.value);
        const fragment = document.definitions.find(definition =>
          definition.kind === Kind.FRAGMENT_DEFINITION && definition.name.value === selection.name.value);
        if (fragment?.kind === Kind.FRAGMENT_DEFINITION) visit(fragment.selectionSet);
      }
    }
  }
  visit(operation.selectionSet);
  return [...names];
}

export function filterInaccessibleEvents<T extends { data?: unknown; errors?: readonly unknown[] }>(source: AsyncIterable<T>, names: readonly string[]): AsyncGenerator<T, void, void> {
  return filterMapIterator(source, result => {
    const { data, errors } = result;
    if ('path' in result) return result;
    const root = typeof data === 'string' ? JSON.parse(data) : data;
    return !errors?.length && root && typeof root === 'object' && names.length > 0 &&
      names.every(name => (root as Record<string, unknown>)[name] === null) ? null : result;
  });
}
